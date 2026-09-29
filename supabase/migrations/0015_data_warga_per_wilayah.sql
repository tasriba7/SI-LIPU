-- 0015: Data warga per wilayah + jejak penginput + pemberitahuan data belum lengkap.
-- Jalankan SETELAH 0001-0014 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent).
--
-- RINGKASAN PERILAKU BARU
--   * Kepala Desa, Sekretaris Desa, Kaur, Kasi  : melihat & mengelola SEMUA data warga.
--   * Kadus                                     : hanya data warga di dusunnya.
--   * Ketua RT                                  : hanya data warga di RT (dan RW/dusun,
--                                                 kalau ditulis di wilayahnya) miliknya.
--   * Data yang dimasukkan Kadus/Ketua RT tetap masuk ke tabel `warga` yang sama,
--     jadi OTOMATIS tampil di akun admin -- tetapi kini tercatat siapa penginputnya.
--   * Kadus/Ketua RT hanya boleh menghapus data yang ia input sendiri.
--
-- FORMAT WILAYAH (kolom profiles.dusun, diisi dari slot posisi_perangkat.wilayah)
--   Kadus     : "Dusun 1", "1", atau "Melati"  (dibandingkan dengan warga.dusun,
--               tanpa peduli huruf besar/kecil, awalan "Dusun", atau angka nol di depan)
--   Ketua RT  : "RT 01/RW 02"  atau  "RT 03"  atau  "Dusun 1 RT 01/RW 02"
--               RT WAJIB ada. RW dan Dusun opsional; kalau ditulis, ikut dicocokkan.
--               Nama dusun di dalam wilayah Ketua RT dibaca 1 kata saja.

-- ---------------------------------------------------------------------------
-- 1. Kolom jejak penginput di tabel warga
-- ---------------------------------------------------------------------------
-- (status_dalam_kk sudah dipakai kode & migrasi 0012; baris ini pengaman saja.)
alter table public.warga add column if not exists status_dalam_kk text;

alter table public.warga
  add column if not exists dibuat_oleh uuid references public.profiles (id) on delete set null,
  add column if not exists dibuat_oleh_nama text,
  add column if not exists dibuat_oleh_role text,
  add column if not exists dibuat_oleh_wilayah text,
  add column if not exists diubah_oleh uuid references public.profiles (id) on delete set null,
  add column if not exists diubah_oleh_nama text;

-- Nama/role/wilayah penginput disimpan sebagai salinan teks supaya tetap
-- terbaca admin walau akun itu kelak dihapus/diganti orang lain (dan karena
-- policy `profiles` hanya mengizinkan staf membaca profilnya sendiri).

create index if not exists warga_dibuat_oleh_idx on public.warga (dibuat_oleh);
create index if not exists warga_wilayah_idx on public.warga (dusun, rt, rw);

-- ---------------------------------------------------------------------------
-- 2. Fungsi bantu (security definer supaya bisa baca profiles milik sendiri)
-- ---------------------------------------------------------------------------
create or replace function public.role_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

-- true = boleh melihat/mengelola semua data warga.
create or replace function public.akses_penuh()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role in ('kepala_desa', 'sekretaris_desa', 'kaur', 'kasi')
       from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Normalisasi nilai wilayah: huruf kecil, buang awalan "dusun/rt/rw", rapikan
-- spasi, buang angka nol di depan.  "Dusun 01" -> "1", " RT 03 " -> "3".
create or replace function public.norm_wil(t text)
returns text
language sql
immutable
as $$
  select nullif(
    case when s ~ '^\d+$' then coalesce(nullif(ltrim(s, '0'), ''), '0') else s end,
    ''
  )
  from (
    select lower(btrim(regexp_replace(
      regexp_replace(coalesce(t, ''), '^\s*(dusun|rt|rw)(\s*[.:\-]\s*|\s+|(?=\d))', '', 'i'),
      '\s+', ' ', 'g'
    ))) as s
  ) x
$$;

-- Apakah (dusun, rt, rw) berada di wilayah akun yang sedang login?
-- Hanya bermakna untuk role kadus & ketua_rt; role lain -> false.
create or replace function public.wilayah_cocok(p_dusun text, p_rt text, p_rw text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_w text;
  v_d text;
  v_rt text;
  v_rw text;
begin
  select p.role, p.dusun into v_role, v_w from public.profiles p where p.id = auth.uid();

  if v_role = 'kadus' then
    return public.norm_wil(v_w) is not null
       and public.norm_wil(p_dusun) = public.norm_wil(v_w);
  end if;

  if v_role = 'ketua_rt' then
    v_rt := (regexp_match(coalesce(v_w, ''), '\mrt\s*[.:\-]?\s*(\d+)', 'i'))[1];
    v_rw := (regexp_match(coalesce(v_w, ''), '\mrw\s*[.:\-]?\s*(\d+)', 'i'))[1];
    v_d  := (regexp_match(coalesce(v_w, ''), '\mdusun\s*[.:\-]?\s*(\w+)', 'i'))[1];

    if v_rt is null then
      return false; -- wilayah Ketua RT tanpa nomor RT: tidak bisa dicocokkan, tolak aman.
    end if;

    return public.norm_wil(p_rt) = public.norm_wil(v_rt)
       and (v_rw is null or public.norm_wil(p_rw) = public.norm_wil(v_rw))
       and (v_d  is null or public.norm_wil(p_dusun) = public.norm_wil(v_d));
  end if;

  return false;
end;
$$;

-- Gerbang tunggal untuk lihat/tambah/ubah warga.
create or replace function public.boleh_kelola_warga(p_dusun text, p_rt text, p_rw text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.akses_penuh()
      or (public.role_saya() in ('kadus', 'ketua_rt')
          and public.wilayah_cocok(p_dusun, p_rt, p_rw))
$$;

grant execute on function public.role_saya() to authenticated;
grant execute on function public.akses_penuh() to authenticated;
grant execute on function public.wilayah_cocok(text, text, text) to authenticated;
grant execute on function public.boleh_kelola_warga(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS tabel warga: ganti policy lama `using (true)` dengan policy per wilayah
-- ---------------------------------------------------------------------------
drop policy if exists "Staf bisa kelola data warga" on public.warga;
drop policy if exists "warga_lihat" on public.warga;
drop policy if exists "warga_tambah" on public.warga;
drop policy if exists "warga_ubah" on public.warga;
drop policy if exists "warga_hapus" on public.warga;

create policy "warga_lihat"
  on public.warga for select to authenticated
  using (public.boleh_kelola_warga(dusun, rt, rw));

create policy "warga_tambah"
  on public.warga for insert to authenticated
  with check (public.boleh_kelola_warga(dusun, rt, rw));

create policy "warga_ubah"
  on public.warga for update to authenticated
  using (public.boleh_kelola_warga(dusun, rt, rw))
  with check (public.boleh_kelola_warga(dusun, rt, rw));

-- Kadus/Ketua RT hanya boleh menghapus data yang ia input sendiri.
create policy "warga_hapus"
  on public.warga for delete to authenticated
  using (
    public.akses_penuh()
    or (public.role_saya() in ('kadus', 'ketua_rt')
        and public.wilayah_cocok(dusun, rt, rw)
        and dibuat_oleh = auth.uid())
  );

-- Tabel keluarga (alamat per No. KK): baca dibatasi wilayah. Penulisan hanya
-- lewat trigger sinkronkan_keluarga (security definer) atau akses penuh.
drop policy if exists "Staf bisa kelola data keluarga" on public.keluarga;
drop policy if exists "keluarga_lihat" on public.keluarga;
drop policy if exists "keluarga_kelola" on public.keluarga;

create policy "keluarga_lihat"
  on public.keluarga for select to authenticated
  using (public.boleh_kelola_warga(dusun, rt, rw));

create policy "keluarga_kelola"
  on public.keluarga for all to authenticated
  using (public.akses_penuh())
  with check (public.akses_penuh());

-- ---------------------------------------------------------------------------
-- 4. Trigger: catat penginput (tidak bisa dipalsukan dari aplikasi)
--    Nama trigger diawali "c"/"i" agar berjalan SEBELUM sinkronkan_keluarga_trigger
--    (PostgreSQL menjalankan trigger sejenis berurutan menurut abjad nama).
-- ---------------------------------------------------------------------------
create or replace function public.isi_penginput_warga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.profiles%rowtype;
begin
  -- Tanpa sesi login (SQL Editor / Secret Key server) jejak dibiarkan apa adanya.
  if auth.uid() is null then
    return new;
  end if;

  select * into v_p from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    new.dibuat_oleh := auth.uid();
    new.dibuat_oleh_nama := coalesce(v_p.nama, 'Tidak diketahui');
    new.dibuat_oleh_role := v_p.role;
    new.dibuat_oleh_wilayah := v_p.dusun;
    new.diubah_oleh := null;
    new.diubah_oleh_nama := null;
  else
    -- Jejak pembuat tidak boleh diubah lewat UPDATE.
    new.dibuat_oleh := old.dibuat_oleh;
    new.dibuat_oleh_nama := old.dibuat_oleh_nama;
    new.dibuat_oleh_role := old.dibuat_oleh_role;
    new.dibuat_oleh_wilayah := old.dibuat_oleh_wilayah;
    new.diubah_oleh := auth.uid();
    new.diubah_oleh_nama := coalesce(v_p.nama, 'Tidak diketahui');
  end if;

  return new;
end;
$$;

drop trigger if exists isi_penginput_warga_trigger on public.warga;
create trigger isi_penginput_warga_trigger
  before insert or update on public.warga
  for each row execute procedure public.isi_penginput_warga();

-- Cegah Kadus/Ketua RT "membajak" KK milik wilayah lain: tanpa ini, menambah
-- anggota dengan No. KK yang sudah ada di wilayah lain akan ikut menimpa alamat
-- seluruh keluarga itu lewat trigger sinkronkan_keluarga.
create or replace function public.cegah_kk_lintas_wilayah()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k public.keluarga%rowtype;
begin
  if auth.uid() is null or public.akses_penuh() then
    return new;
  end if;
  if new.no_kk is null or new.no_kk = '' then
    return new;
  end if;

  select * into v_k from public.keluarga where no_kk = new.no_kk;

  if v_k.id is not null
     and (coalesce(v_k.dusun, '') <> '' or coalesce(v_k.rt, '') <> '' or coalesce(v_k.rw, '') <> '')
     and not public.wilayah_cocok(v_k.dusun, v_k.rt, v_k.rw) then
    raise exception
      'No. KK % sudah tercatat di wilayah lain. Hubungi admin desa jika data ini perlu dipindahkan.',
      new.no_kk
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists cegah_kk_lintas_wilayah_trigger on public.warga;
create trigger cegah_kk_lintas_wilayah_trigger
  before insert or update on public.warga
  for each row execute procedure public.cegah_kk_lintas_wilayah();

-- ---------------------------------------------------------------------------
-- 5. View kelengkapan data (mengikuti RLS pemanggil: security_invoker, butuh
--    PostgreSQL 15+ -- default pada project Supabase saat ini).
--
--    Kolom yang dihitung "belum lengkap" jika kosong:
--      no_kk, tempat_lahir, jenis_kelamin, status_kawin, status_dalam_kk,
--      agama, pekerjaan, alamat, dusun, rt, rw
--    NIK, nama, tanggal lahir sudah wajib saat input. No. HP sengaja tidak
--    dihitung karena di form memang "opsional".
--    Kalau daftar ini diubah, ubah juga lib/kelengkapan.js.
-- ---------------------------------------------------------------------------
drop view if exists public.ringkasan_kolom_kosong;
drop view if exists public.ringkasan_kelengkapan_penginput;
drop view if exists public.warga_kelengkapan;

create view public.warga_kelengkapan
with (security_invoker = true) as
select
  w.id, w.nik, w.no_kk, w.nama_lengkap, w.tempat_lahir, w.tanggal_lahir,
  w.jenis_kelamin, w.alamat, w.dusun, w.rt, w.rw, w.no_hp, w.status_kawin,
  w.status_dalam_kk, w.pekerjaan, w.agama, w.created_at, w.updated_at,
  w.dibuat_oleh, w.dibuat_oleh_nama, w.dibuat_oleh_role, w.dibuat_oleh_wilayah,
  w.diubah_oleh, w.diubah_oleh_nama,
  k.kolom_kosong,
  cardinality(k.kolom_kosong) as jumlah_kosong
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

-- Ringkasan per penginput (untuk kotak pemberitahuan di dashboard).
create view public.ringkasan_kelengkapan_penginput
with (security_invoker = true) as
select
  dibuat_oleh,
  max(dibuat_oleh_nama)    as nama,
  max(dibuat_oleh_role)    as role,
  max(dibuat_oleh_wilayah) as wilayah,
  count(*)::int                                    as total,
  (count(*) filter (where jumlah_kosong > 0))::int as belum_lengkap
from public.warga_kelengkapan
group by dibuat_oleh;

-- Kolom apa yang paling sering kosong, per penginput.
create view public.ringkasan_kolom_kosong
with (security_invoker = true) as
select
  dibuat_oleh,
  kolom,
  count(*)::int as jumlah
from public.warga_kelengkapan, unnest(kolom_kosong) as kolom
group by dibuat_oleh, kolom;

grant select on public.warga_kelengkapan to authenticated;
grant select on public.ringkasan_kelengkapan_penginput to authenticated;
grant select on public.ringkasan_kolom_kosong to authenticated;
