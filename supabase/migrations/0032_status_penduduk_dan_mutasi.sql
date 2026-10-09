-- 0032: STATUS KEPENDUDUKAN + RIWAYAT MUTASI (tahap 1: penduduk meninggal).
-- Jalankan SETELAH 0001-0031 (Supabase Dashboard -> SQL Editor -> New query -> Run),
-- dan SEBELUM men-deploy kode aplikasi yang baru. Aman dijalankan ulang (idempotent).
-- Tidak menghapus atau mengubah data warga yang sudah ada: semua warga lama
-- otomatis berstatus 'aktif'.
--
-- ISI:
--   1. warga.status_kependudukan ('aktif' | 'meninggal' | 'pindah') + tanggal_status
--   2. Tabel mutasi_penduduk (riwayat: siapa, jenis, tanggal, surat, pencatat)
--   3. Kunci kolom status: hanya fungsi di bawah yang boleh mengubahnya
--   4. Fungsi tandai_meninggal() dan batalkan_mutasi()
--   5. Statistik beranda/dashboard hanya menghitung penduduk AKTIF
--   6. Satu No. KK boleh punya Kepala Keluarga baru bila kepala lama sudah tidak aktif
--   7. Pencarian publik (NIK + tgl lahir) mengabaikan penduduk yang tidak aktif
--
-- Penduduk yang meninggal TIDAK dihapus: barisnya tetap ada (riwayat, arsip
-- surat, laporan), hanya statusnya berubah sehingga tidak ikut dihitung.

begin;

-- 1. Kolom status -------------------------------------------------------------
alter table public.warga
  add column if not exists status_kependudukan text not null default 'aktif',
  add column if not exists tanggal_status date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'warga_status_kependudukan_check'
  ) then
    alter table public.warga
      add constraint warga_status_kependudukan_check
      check (status_kependudukan in ('aktif', 'meninggal', 'pindah'));
  end if;
end $$;

create index if not exists warga_status_idx on public.warga (status_kependudukan);

-- 2. Riwayat mutasi ---------------------------------------------------------------
create table if not exists public.mutasi_penduduk (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga (id) on delete restrict,
  jenis text not null check (jenis in ('meninggal', 'pindah_keluar', 'datang')),
  tanggal date not null,
  keterangan text,
  surat_terbit_id uuid references public.surat_terbit (id) on delete set null,
  dicatat_oleh uuid references public.profiles (id) on delete set null,
  dicatat_oleh_nama text,
  created_at timestamptz not null default now(),
  dibatalkan_pada timestamptz,
  dibatalkan_oleh uuid references public.profiles (id) on delete set null,
  dibatalkan_oleh_nama text,
  alasan_batal text
);

create index if not exists mutasi_penduduk_warga_idx on public.mutasi_penduduk (warga_id);
create index if not exists mutasi_penduduk_jenis_tanggal_idx on public.mutasi_penduduk (jenis, tanggal desc);
create index if not exists mutasi_penduduk_surat_idx on public.mutasi_penduduk (surat_terbit_id);

-- Satu penduduk hanya punya satu catatan 'meninggal' yang berlaku.
create unique index if not exists mutasi_meninggal_berlaku_uq
  on public.mutasi_penduduk (warga_id)
  where jenis = 'meninggal' and dibatalkan_pada is null;

alter table public.mutasi_penduduk enable row level security;

-- Baca: hanya yang boleh melihat penduduk tersebut (ikut RLS tabel warga, jadi
-- Kadus/Ketua RT hanya melihat wilayahnya). Tulis: TIDAK ADA policy -> hanya
-- lewat fungsi security definer di bawah.
drop policy if exists "mutasi_lihat" on public.mutasi_penduduk;
create policy "mutasi_lihat"
  on public.mutasi_penduduk for select to authenticated
  using (exists (select 1 from public.warga w where w.id = mutasi_penduduk.warga_id));

revoke all on table public.mutasi_penduduk from anon;
revoke insert, update, delete on table public.mutasi_penduduk from authenticated;
grant select on table public.mutasi_penduduk to authenticated;

-- 3. Kunci kolom status ------------------------------------------------------------
-- Tanpa ini, Kadus/Ketua RT (yang boleh mengubah warga di wilayahnya) bisa
-- mengubah status lewat API langsung. Hanya fungsi mutasi yang menyalakan
-- penanda lokal 'app.mutasi_warga' selama transaksinya. SQL Editor / Secret
-- Key (auth.uid() null) tetap diizinkan, sama seperti trigger lain di proyek ini.
create or replace function public.kunci_status_penduduk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.mutasi_warga', true), '') = '1' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status_kependudukan := 'aktif';
    new.tanggal_status := null;
  else
    new.status_kependudukan := old.status_kependudukan;
    new.tanggal_status := old.tanggal_status;
  end if;
  return new;
end;
$$;

drop trigger if exists kunci_status_penduduk_trigger on public.warga;
create trigger kunci_status_penduduk_trigger
  before insert or update on public.warga
  for each row execute procedure public.kunci_status_penduduk();

-- 4. Fungsi mutasi -------------------------------------------------------------------
create or replace function public.tandai_meninggal(
  p_warga_id uuid,
  p_tanggal date,
  p_surat_terbit_id uuid default null,
  p_keterangan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.warga%rowtype;
  v_m public.mutasi_penduduk%rowtype;
  v_nama text;
  v_sisa integer := 0;
begin
  if auth.uid() is null or not public.akses_tulis_penuh() then
    raise exception 'Hanya Administrator, Sekretaris Desa, Kaur, atau Kasi yang boleh mengubah status penduduk.'
      using errcode = 'P0001';
  end if;

  select * into v_w from public.warga where id = p_warga_id for update;
  if not found then
    raise exception 'Data penduduk tidak ditemukan.' using errcode = 'P0001';
  end if;

  if p_tanggal is null or p_tanggal > current_date then
    raise exception 'Tanggal meninggal tidak valid (tidak boleh kosong atau di masa depan).'
      using errcode = 'P0001';
  end if;
  if p_tanggal < v_w.tanggal_lahir then
    raise exception 'Tanggal meninggal tidak boleh sebelum tanggal lahir (%).', v_w.tanggal_lahir
      using errcode = 'P0001';
  end if;

  select coalesce(p.nama, 'Tidak diketahui') into v_nama
  from public.profiles p where p.id = auth.uid();

  if v_w.status_kependudukan <> 'aktif' then
    -- Surat yang sama disimpan ulang: cukup perbarui tanggalnya.
    select * into v_m from public.mutasi_penduduk
    where warga_id = p_warga_id and jenis = 'meninggal' and dibatalkan_pada is null
    limit 1;

    if v_m.id is not null
       and p_surat_terbit_id is not null
       and v_m.surat_terbit_id = p_surat_terbit_id then
      perform set_config('app.mutasi_warga', '1', true);
      update public.mutasi_penduduk set tanggal = p_tanggal where id = v_m.id;
      update public.warga set tanggal_status = p_tanggal where id = p_warga_id;
      perform set_config('app.mutasi_warga', '', true);
      return jsonb_build_object('ok', true, 'diperbarui', true, 'nama', v_w.nama_lengkap);
    end if;

    raise exception '% sudah berstatus % di data penduduk.',
      v_w.nama_lengkap,
      case v_w.status_kependudukan when 'meninggal' then 'meninggal' else 'pindah keluar' end
      using errcode = 'P0001';
  end if;

  perform set_config('app.mutasi_warga', '1', true);
  update public.warga
    set status_kependudukan = 'meninggal', tanggal_status = p_tanggal
    where id = p_warga_id;
  perform set_config('app.mutasi_warga', '', true);

  insert into public.mutasi_penduduk
    (warga_id, jenis, tanggal, keterangan, surat_terbit_id, dicatat_oleh, dicatat_oleh_nama)
  values
    (p_warga_id, 'meninggal', p_tanggal, nullif(left(coalesce(p_keterangan, ''), 300), ''),
     p_surat_terbit_id, auth.uid(), v_nama);

  if v_w.no_kk is not null and v_w.no_kk <> '' then
    select count(*) into v_sisa from public.warga
    where no_kk = v_w.no_kk and status_kependudukan = 'aktif';
  end if;

  return jsonb_build_object(
    'ok', true,
    'diperbarui', false,
    'nama', v_w.nama_lengkap,
    'no_kk', v_w.no_kk,
    'kepala_keluarga', coalesce(v_w.status_dalam_kk = 'Kepala Keluarga', false),
    'sisa_anggota', v_sisa
  );
end;
$$;

-- Hanya Administrator yang boleh membatalkan (mis. salah memilih orang).
create or replace function public.batalkan_mutasi(p_mutasi_id uuid, p_alasan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.mutasi_penduduk%rowtype;
  v_nama text;
begin
  if auth.uid() is null or not public.adalah_admin() then
    raise exception 'Pembatalan mutasi hanya bisa dilakukan oleh Administrator.'
      using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_alasan, ''))) < 3 then
    raise exception 'Alasan pembatalan wajib diisi.' using errcode = 'P0001';
  end if;

  select * into v_m from public.mutasi_penduduk where id = p_mutasi_id for update;
  if not found then
    raise exception 'Catatan mutasi tidak ditemukan.' using errcode = 'P0001';
  end if;
  if v_m.dibatalkan_pada is not null then
    raise exception 'Catatan mutasi ini sudah dibatalkan sebelumnya.' using errcode = 'P0001';
  end if;
  if v_m.jenis not in ('meninggal', 'pindah_keluar') then
    raise exception 'Jenis mutasi ini belum bisa dibatalkan dari sini.' using errcode = 'P0001';
  end if;

  select coalesce(p.nama, 'Tidak diketahui') into v_nama
  from public.profiles p where p.id = auth.uid();

  -- Mengembalikan ke 'aktif' bisa ditolak trigger Kepala Keluarga bila KK itu
  -- sudah punya Kepala Keluarga baru; pesannya diteruskan ke pengguna.
  perform set_config('app.mutasi_warga', '1', true);
  update public.warga
    set status_kependudukan = 'aktif', tanggal_status = null
    where id = v_m.warga_id;
  perform set_config('app.mutasi_warga', '', true);

  update public.mutasi_penduduk
    set dibatalkan_pada = now(),
        dibatalkan_oleh = auth.uid(),
        dibatalkan_oleh_nama = v_nama,
        alasan_batal = left(btrim(p_alasan), 300)
    where id = v_m.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.tandai_meninggal(uuid, date, uuid, text) from public, anon;
revoke execute on function public.batalkan_mutasi(uuid, text) from public, anon;
grant execute on function public.tandai_meninggal(uuid, date, uuid, text) to authenticated;
grant execute on function public.batalkan_mutasi(uuid, text) to authenticated;

-- 5. View kelengkapan: tambah kolom status di PALING AKHIR ---------------------------
create or replace view public.warga_kelengkapan
with (security_invoker = true) as
select
  w.id, w.nik, w.no_kk, w.nama_lengkap, w.tempat_lahir, w.tanggal_lahir,
  w.jenis_kelamin, w.alamat, w.dusun, w.rt, w.rw, w.no_hp, w.status_kawin,
  w.status_dalam_kk, w.pekerjaan, w.agama, w.created_at, w.updated_at,
  w.dibuat_oleh, w.dibuat_oleh_nama, coalesce(public.role_terkini(w.dibuat_oleh), w.dibuat_oleh_role) as dibuat_oleh_role, w.dibuat_oleh_wilayah,
  w.diubah_oleh, w.diubah_oleh_nama,
  k.kolom_kosong,
  cardinality(k.kolom_kosong) as jumlah_kosong,
  w.pendidikan,
  w.status_kependudukan,
  w.tanggal_status
from public.warga w
cross join lateral (
  select array_remove(array[
    case when coalesce(btrim(w.no_kk), '')           = '' then 'no_kk' end,
    case when coalesce(btrim(w.tempat_lahir), '')    = '' then 'tempat_lahir' end,
    case when coalesce(btrim(w.jenis_kelamin), '')   = '' then 'jenis_kelamin' end,
    case when coalesce(btrim(w.status_kawin), '')    = '' then 'status_kawin' end,
    case when coalesce(btrim(w.status_dalam_kk), '') = '' then 'status_dalam_kk' end,
    case when coalesce(btrim(w.agama), '')           = '' then 'agama' end,
    case when coalesce(btrim(w.pekerjaan), '')       = '' then 'pekerjaan' end,
    case when coalesce(btrim(w.alamat), '')          = '' then 'alamat' end,
    case when coalesce(btrim(w.dusun), '')           = '' then 'dusun' end,
    case when coalesce(btrim(w.rt), '')              = '' then 'rt' end,
    case when coalesce(btrim(w.rw), '')              = '' then 'rw' end
  ], null) as kolom_kosong
) k;

-- 6. Kepala Keluarga: hanya hitung penduduk aktif ------------------------------------
create or replace function public.sinkronkan_keluarga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kk public.keluarga%rowtype;
  v_ada_isian boolean;
begin
  -- Warga tanpa No. KK (belum lengkap datanya) tidak disinkron, tidak diblok.
  if new.no_kk is null or new.no_kk = '' then
    return new;
  end if;

  -- Jaminan sistem: maksimal 1 Kepala Keluarga aktif per No. KK.
  -- Penduduk yang sudah meninggal/pindah tidak dihitung: KK boleh punya
  -- Kepala Keluarga baru walau baris kepala lama masih tersimpan (riwayat).
  if new.status_dalam_kk = 'Kepala Keluarga'
     and new.status_kependudukan = 'aktif'
     and exists (
    select 1 from public.warga
    where no_kk = new.no_kk
      and status_dalam_kk = 'Kepala Keluarga'
      and status_kependudukan = 'aktif'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception
      'Kartu Keluarga % sudah memiliki Kepala Keluarga lain. Satu KK hanya boleh 1 Kepala Keluarga.',
      new.no_kk
      using errcode = 'P0001';
  end if;

  select * into v_kk from public.keluarga where no_kk = new.no_kk;
  v_ada_isian :=
    coalesce(new.alamat, '') <> '' or coalesce(new.dusun, '') <> ''
    or coalesce(new.rt, '') <> '' or coalesce(new.rw, '') <> '';

  if v_kk.id is null then
    -- No. KK baru bagi sistem -> catat sebagai data keluarga baru.
    insert into public.keluarga (no_kk, alamat, dusun, rt, rw)
    values (new.no_kk, new.alamat, new.dusun, new.rt, new.rw);
  elsif v_ada_isian then
    -- Anggota ini mengisi alamat -> jadikan alamat resmi keluarga.
    update public.keluarga
      set alamat = new.alamat, dusun = new.dusun, rt = new.rt, rw = new.rw
      where no_kk = new.no_kk;

    -- Ratakan ke semua anggota LAIN di No. KK yang sama. Dibatasi
    -- pg_trigger_depth() supaya tidak rekursi tak terbatas (baris yang
    -- ikut diupdate di sini juga memicu trigger ini, tapi hanya 1 level).
    if pg_trigger_depth() <= 1 then
      update public.warga
        set alamat = new.alamat, dusun = new.dusun, rt = new.rt, rw = new.rw
        where no_kk = new.no_kk and id <> new.id;
    end if;
  else
    -- Anggota baru tidak mengisi alamat -> otomatis ikut alamat keluarga.
    new.alamat := v_kk.alamat;
    new.dusun := v_kk.dusun;
    new.rt := v_kk.rt;
    new.rw := v_kk.rw;
  end if;

  return new;
end;
$$;

-- 7. Statistik: hanya penduduk AKTIF -----------------------------------------------------
create or replace function public.statistik_beranda()
returns table (
  total_penduduk bigint,
  total_kepala_keluarga bigint,
  total_ajuan_diproses bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.warga where status_kependudukan = 'aktif') as total_penduduk,
    (
      select count(distinct no_kk)
      from public.warga
      where no_kk is not null and no_kk <> ''
        and status_kependudukan = 'aktif'
    ) as total_kepala_keluarga,
    (
      select count(*)
      from public.pengajuan_layanan
      where status <> 'diajukan'
    ) as total_ajuan_diproses;
$$;

grant execute on function public.statistik_beranda() to anon, authenticated;

create or replace function public.statistik_beranda_detail()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with usia as (
    select
      case
        when tanggal_lahir is null then null
        else date_part('year', age(current_date, tanggal_lahir))::int
      end as umur
    from public.warga
    where status_kependudukan = 'aktif'
  ),
  usia_kelompok as (
    select
      case
        when umur is null then 'Belum Diisi'
        when umur between 0 and 4 then '0-4 Tahun'
        when umur between 5 and 6 then '5-6 Tahun'
        when umur between 7 and 15 then '7-15 Tahun'
        when umur between 16 and 18 then '16-18 Tahun'
        when umur between 19 and 25 then '19-25 Tahun'
        when umur between 26 and 35 then '26-35 Tahun'
        when umur between 36 and 45 then '36-45 Tahun'
        when umur between 46 and 55 then '46-55 Tahun'
        when umur between 56 and 59 then '56-59 Tahun'
        else '60+ Tahun'
      end as kelompok,
      case
        when umur is null then 99
        when umur between 0 and 4 then 1
        when umur between 5 and 6 then 2
        when umur between 7 and 15 then 3
        when umur between 16 and 18 then 4
        when umur between 19 and 25 then 5
        when umur between 26 and 35 then 6
        when umur between 36 and 45 then 7
        when umur between 46 and 55 then 8
        when umur between 56 and 59 then 9
        else 10
      end as urutan
    from usia
  ),
  pekerjaan_semua as (
    select
      coalesce(nullif(trim(pekerjaan), ''), 'Belum Diisi') as label,
      count(*) as jumlah
    from public.warga
    where status_kependudukan = 'aktif'
    group by 1
  ),
  pekerjaan_top as (
    select label, jumlah
    from pekerjaan_semua
    order by jumlah desc, label asc
    limit 8
  ),
  pekerjaan_sisa as (
    select
      'Lainnya' as label,
      coalesce(sum(jumlah), 0) as jumlah
    from pekerjaan_semua
    where label not in (select label from pekerjaan_top)
  )
  select jsonb_build_object(

    'per_agama', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(agama), ''), 'Belum Diisi') as label, count(*) as jumlah
        from public.warga
    where status_kependudukan = 'aktif'
        group by 1
      ) t
    ),

    'per_status_kawin', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(status_kawin), ''), 'Belum Diisi') as label, count(*) as jumlah
        from public.warga
    where status_kependudukan = 'aktif'
        group by 1
      ) t
    ),

    'per_jenis_kelamin', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by urutan), '[]'::jsonb)
      from (
        select
          case jenis_kelamin
            when 'L' then 'Laki-laki'
            when 'P' then 'Perempuan'
            else 'Belum Diisi'
          end as label,
          case jenis_kelamin when 'L' then 1 when 'P' then 2 else 3 end as urutan,
          count(*) as jumlah
        from public.warga
    where status_kependudukan = 'aktif'
        group by 1, 2
      ) t
    ),

    'per_rentang_usia', (
      select coalesce(jsonb_agg(jsonb_build_object('label', kelompok, 'jumlah', jumlah) order by urutan), '[]'::jsonb)
      from (
        select kelompok, urutan, count(*) as jumlah
        from usia_kelompok
        group by kelompok, urutan
      ) t
    ),

    'per_pekerjaan', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select label, jumlah from pekerjaan_top
        union all
        select label, jumlah from pekerjaan_sisa where jumlah > 0
      ) t
    )

  );
$$;

grant execute on function public.statistik_beranda_detail() to anon, authenticated;

create or replace function public.statistik_beranda_dusun()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', label,
        'jumlah', jumlah,
        'laki', laki,
        'perempuan', perempuan
      )
      order by urutan, label
    ),
    '[]'::jsonb
  )
  from (
    select
      coalesce(
        nullif(initcap(regexp_replace(trim(dusun), '\s+', ' ', 'g')), ''),
        'Belum Diisi'
      ) as label,
      case when nullif(trim(dusun), '') is null then 1 else 0 end as urutan,
      count(*) as jumlah,
      count(*) filter (where jenis_kelamin = 'L') as laki,
      count(*) filter (where jenis_kelamin = 'P') as perempuan
    from public.warga
    where status_kependudukan = 'aktif'
    group by 1, 2
  ) t;
$$;

grant execute on function public.statistik_beranda_dusun() to anon, authenticated;

-- 8. Pencarian publik (NIK + tanggal lahir): penduduk tidak aktif tidak ditemukan ---------
-- Hak eksekusi TIDAK diubah (sudah dikunci ke service_role oleh 0029).
create or replace function public.cari_warga_publik(
  p_nik text,
  p_tanggal_lahir date,
  p_identifier text
)
returns table (
  warga_id uuid,
  nama_lengkap text,
  dusun text,
  rt text,
  rw text,
  no_hp text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.warga%rowtype;
begin
  select * into v_row
  from public.warga w
  where w.nik = p_nik and w.tanggal_lahir = p_tanggal_lahir
    and w.status_kependudukan = 'aktif'
  limit 1;

  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_row.id is not null);

  if v_row.id is null then
    return;
  end if;

  return query
    select v_row.id, v_row.nama_lengkap, v_row.dusun, v_row.rt, v_row.rw, v_row.no_hp;
end;
$$;

commit;
