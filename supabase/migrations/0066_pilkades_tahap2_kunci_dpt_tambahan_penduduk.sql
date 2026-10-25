-- 0066: Pilkades - Tahap 2 "DPT terkunci, Pemilih Tambahan, sambungan data penduduk".
-- Idempotent. Prasyarat: 0052, 0054, 0055, 0058, 0065 sudah dijalankan.
--
-- ISI
--  1. KUNCI DPT: setelah DPT ditetapkan, daftar pemilih (pilkades_pemilih) dan TPS tidak bisa
--     diubah, dan DPT/DPS tidak bisa ditetapkan ulang. Dijaga di database. (Perbaikan darurat
--     tetap bisa lewat SQL Editor Supabase karena auth.uid() kosong di sana.)
--  2. PEMILIH TAMBAHAN: warga yang memenuhi syarat tetapi terlewat dari DPT dicatat di tabel
--     tersendiri (DPT tidak diubah), dengan alasan wajib, tercatat di Riwayat.
--  3. SAMBUNGAN DATA PENDUDUK: fungsi pilkades_sinkron_penduduk menandai pemilih yang di data
--     penduduk sudah meninggal/pindah, dan yang baru datang kurang dari 6 bulan sebelum hari
--     pemungutan (diberi status "Perlu dicek").
--  4. Penetapan DPS/DPT ditolak bila ada pemilih "Memenuhi syarat" yang sudah meninggal/pindah.
--
-- ROLLBACK: lihat akhir file.

begin;

-- 1. Kunci DPT ------------------------------------------------------------------------------
create or replace function public.pilkades_dpt_ada(p_periode uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = 'DPT')
$$;
revoke execute on function public.pilkades_dpt_ada(uuid) from public, anon;
grant  execute on function public.pilkades_dpt_ada(uuid) to authenticated;

create or replace function public.pilkades_kunci_setelah_dpt()
returns trigger
language plpgsql
as $$
declare v_periode uuid;
begin
  -- SQL Editor / kunci layanan (tanpa pengguna login) tetap boleh untuk perbaikan darurat.
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then v_periode := old.periode_id; else v_periode := new.periode_id; end if;
  if public.pilkades_dpt_ada(v_periode) then
    raise exception 'DPT sudah ditetapkan, jadi daftar pemilih dan TPS terkunci dan tidak bisa diubah. Pemilih yang terlewat dicatat lewat menu Pemilih Tambahan.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists pilkades_pemilih_kunci_dpt on public.pilkades_pemilih;
create trigger pilkades_pemilih_kunci_dpt
  before insert or update on public.pilkades_pemilih
  for each row execute function public.pilkades_kunci_setelah_dpt();

drop trigger if exists pilkades_tps_kunci_dpt on public.pilkades_tps;
create trigger pilkades_tps_kunci_dpt
  before insert or update or delete on public.pilkades_tps
  for each row execute function public.pilkades_kunci_setelah_dpt();

-- Penetapan DPS/DPT (diganti dari 0058: + kunci DPT + penjaga penduduk) ---------------------
create or replace function public.pilkades_tetapkan_daftar(
  p_periode uuid, p_jenis text, p_tanggal date, p_nomor text, p_catatan text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_versi integer;
  v_jumlah integer;
  v_nama text;
  v_acuan date;
  v_usia integer;
  v_kawin boolean;
  v_muda integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_jenis not in ('DPS', 'DPT') then
    raise exception 'Jenis daftar tidak valid.';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal penetapan wajib diisi.';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan.';
  end if;
  -- KUNCI DPT: setelah DPT ditetapkan, tidak ada penetapan ulang (DPS maupun DPT).
  if exists (select 1 from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = 'DPT') then
    raise exception 'DPT sudah ditetapkan dan terkunci. Daftar resmi tidak bisa ditetapkan ulang. Pemilih yang terlewat dicatat lewat menu Pemilih Tambahan.';
  end if;
  if p_jenis = 'DPT' and not exists (
    select 1 from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = 'DPS'
  ) then
    raise exception 'DPT hanya bisa ditetapkan setelah ada DPS.';
  end if;

  select count(*) into v_jumlah
  from public.pilkades_pemilih
  where periode_id = p_periode and status_verifikasi = 'memenuhi_syarat';
  if v_jumlah = 0 then
    raise exception 'Belum ada pemilih berstatus "Memenuhi syarat".';
  end if;

  -- PENJAGA PENDUDUK: penduduk yang sudah meninggal/pindah tidak boleh masuk daftar.
  select count(*) into v_muda
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  where pm.periode_id = p_periode and pm.status_verifikasi = 'memenuhi_syarat'
    and w.status_kependudukan <> 'aktif';
  if v_muda > 0 then
    raise exception '% pemilih berstatus "Memenuhi syarat" tetapi di data penduduk sudah meninggal/pindah. Klik "Samakan dengan data penduduk" di Langkah 1 dulu.', v_muda;
  end if;

  -- PENJAGA USIA: tolak bila ada yang "memenuhi syarat" tetapi usianya di bawah batas periode.
  select coalesce(tanggal_pemungutan, current_date), usia_minimum, termasuk_pernah_kawin
    into v_acuan, v_usia, v_kawin
  from public.pilkades_periode where id = p_periode;

  select count(*) into v_muda
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  where pm.periode_id = p_periode and pm.status_verifikasi = 'memenuhi_syarat'
    and extract(year from age(v_acuan, w.tanggal_lahir)) < v_usia
    and not (v_kawin and public.pilkades_pernah_kawin(w.status_kawin)
             and extract(year from age(v_acuan, w.tanggal_lahir)) >= 15);
  if v_muda > 0 then
    raise exception '% pemilih berstatus "Memenuhi syarat" tetapi usianya kurang dari % tahun. Terapkan ulang filter usia atau koreksi datanya dulu.', v_muda, v_usia;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_periode::text || p_jenis));
  select coalesce(max(versi), 0) + 1 into v_versi
  from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = p_jenis;

  select nama into v_nama from public.profiles where id = auth.uid();

  insert into public.pilkades_daftar_tetap
    (periode_id, jenis, versi, tanggal_penetapan, nomor_berita_acara, catatan, jumlah,
     ditetapkan_oleh, ditetapkan_oleh_nama)
  values (p_periode, p_jenis, v_versi, p_tanggal, nullif(trim(p_nomor), ''),
          nullif(trim(p_catatan), ''), v_jumlah, auth.uid(), v_nama)
  returning id into v_id;

  insert into public.pilkades_daftar_tetap_isi
    (daftar_id, urut, warga_id, nama_lengkap, nik_samar, jenis_kelamin, tempat_lahir,
     tanggal_lahir, dusun, rt, rw, alamat, tps_nama)
  select v_id,
         row_number() over (order by w.dusun nulls last, w.nama_lengkap, pm.id),
         w.id, w.nama_lengkap,
         left(w.nik, 4) || repeat('*', greatest(length(w.nik) - 6, 0)) || right(w.nik, 2),
         w.jenis_kelamin, w.tempat_lahir, w.tanggal_lahir, w.dusun, w.rt, w.rw, w.alamat,
         t.nama
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  left join public.pilkades_tps t on t.id = pm.tps_id
  where pm.periode_id = p_periode and pm.status_verifikasi = 'memenuhi_syarat';

  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, 'tetapkan_' || lower(p_jenis),
          p_jenis || ' versi ' || v_versi || ', ' || v_jumlah || ' pemilih',
          auth.uid(), v_nama);

  return v_id;
end;
$$;

revoke execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) from public, anon;
grant  execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) to authenticated;

-- 2. Pemilih Tambahan ------------------------------------------------------------------------
create table if not exists public.pilkades_pemilih_tambahan (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete restrict,
  warga_id uuid not null,
  nama_lengkap text not null,
  nik_samar text,
  jenis_kelamin text,
  dusun text,
  rt text,
  rw text,
  tps_nama text not null,
  alasan text not null,
  dicatat_oleh uuid references public.profiles(id) on delete set null,
  dicatat_oleh_nama text,
  created_at timestamptz not null default now(),
  unique (periode_id, warga_id)
);
revoke all on public.pilkades_pemilih_tambahan from public, anon, authenticated;
grant select on public.pilkades_pemilih_tambahan to authenticated;
alter table public.pilkades_pemilih_tambahan enable row level security;
drop policy if exists "pilkades_tambahan_lihat" on public.pilkades_pemilih_tambahan;
create policy "pilkades_tambahan_lihat" on public.pilkades_pemilih_tambahan
  for select to authenticated using (public.boleh_lihat_pilkades());

-- Pemeriksaan kelayakan satu warga. Hasil NULL = layak; selain itu alasan penolakan.
create or replace function public.pilkades_cek_layak_tambahan(p_periode uuid, p_warga uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  w public.warga%rowtype;
  v_acuan date;
  v_umur integer;
  v_kawin boolean;
  v_dpt uuid;
  v_datang date;
begin
  select * into w from public.warga where id = p_warga;
  if not found then return 'Data warga tidak ditemukan.'; end if;
  if w.status_kependudukan <> 'aktif' then
    return 'Bukan penduduk aktif (' || w.status_kependudukan || ').';
  end if;

  select coalesce(tanggal_pemungutan, current_date) into v_acuan
  from public.pilkades_periode where id = p_periode;
  if v_acuan is null then return 'Periode tidak ditemukan.'; end if;

  v_umur := extract(year from age(v_acuan, w.tanggal_lahir))::int;
  v_kawin := public.pilkades_pernah_kawin(w.status_kawin);
  if not (v_umur >= 17 or (v_kawin and v_umur >= 15)) then
    return 'Usia belum cukup (17 tahun atau sudah/pernah kawin) pada hari pemungutan.';
  end if;

  select max(m.tanggal) into v_datang from public.mutasi_penduduk m
  where m.warga_id = p_warga and m.jenis = 'datang' and m.dibatalkan_pada is null;
  if v_datang is not null and v_datang > (v_acuan - interval '6 months')::date then
    return 'Baru datang pada ' || to_char(v_datang, 'DD-MM-YYYY') || ', kurang dari 6 bulan sebelum hari pemungutan.';
  end if;

  select id into v_dpt from public.pilkades_daftar_tetap
  where periode_id = p_periode and jenis = 'DPT' order by versi desc limit 1;
  if v_dpt is not null and exists (
    select 1 from public.pilkades_daftar_tetap_isi where daftar_id = v_dpt and warga_id = p_warga
  ) then
    return 'Sudah ada di DPT.';
  end if;
  if exists (select 1 from public.pilkades_pemilih_tambahan where periode_id = p_periode and warga_id = p_warga) then
    return 'Sudah tercatat sebagai Pemilih Tambahan.';
  end if;
  return null;
end;
$$;
revoke execute on function public.pilkades_cek_layak_tambahan(uuid, uuid) from public, anon;
grant  execute on function public.pilkades_cek_layak_tambahan(uuid, uuid) to authenticated;

-- Pencarian warga (kolom terbatas; NIK disamarkan). Cari nama (min. 3 huruf) atau NIK lengkap.
create or replace function public.pilkades_cari_warga_tambahan(p_periode uuid, p_cari text)
returns table (
  warga_id uuid, nama_lengkap text, nik_samar text, jenis_kelamin text,
  dusun text, rt text, rw text, umur integer, alasan_tidak text
)
language plpgsql stable security definer
set search_path = public
as $$
declare v_cari text := trim(coalesce(p_cari, ''));
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if length(v_cari) < 3 then
    raise exception 'Ketik minimal 3 huruf nama, atau NIK lengkap.';
  end if;
  return query
  select w.id, w.nama_lengkap,
         left(w.nik, 4) || repeat('*', greatest(length(w.nik) - 6, 0)) || right(w.nik, 2),
         w.jenis_kelamin, w.dusun, w.rt, w.rw,
         extract(year from age(coalesce((select tanggal_pemungutan from public.pilkades_periode where id = p_periode), current_date), w.tanggal_lahir))::int,
         public.pilkades_cek_layak_tambahan(p_periode, w.id)
  from public.warga w
  where w.nama_lengkap ilike '%' || replace(replace(v_cari, '%', ''), '_', '') || '%'
     or w.nik = v_cari
  order by w.nama_lengkap
  limit 20;
end;
$$;
revoke execute on function public.pilkades_cari_warga_tambahan(uuid, text) from public, anon;
grant  execute on function public.pilkades_cari_warga_tambahan(uuid, text) to authenticated;

create or replace function public.pilkades_tambah_pemilih(p_periode uuid, p_warga uuid, p_tps uuid, p_alasan text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  w public.warga%rowtype;
  v_tps public.pilkades_tps%rowtype;
  v_tolak text;
  v_nama text;
  v_id uuid;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if not public.pilkades_dpt_ada(p_periode) then
    raise exception 'Pemilih Tambahan hanya bisa dicatat setelah DPT ditetapkan. Sebelum itu, tambahkan lewat Periksa Pemilih.';
  end if;
  if p_alasan is null or length(trim(p_alasan)) < 5 then
    raise exception 'Alasan wajib diisi (minimal 5 huruf).';
  end if;
  v_tolak := public.pilkades_cek_layak_tambahan(p_periode, p_warga);
  if v_tolak is not null then
    raise exception '%', v_tolak;
  end if;
  select * into v_tps from public.pilkades_tps where id = p_tps and periode_id = p_periode;
  if not found then
    raise exception 'TPS tidak ditemukan.';
  end if;
  select * into w from public.warga where id = p_warga;
  select nama into v_nama from public.profiles where id = auth.uid();

  insert into public.pilkades_pemilih_tambahan
    (periode_id, warga_id, nama_lengkap, nik_samar, jenis_kelamin, dusun, rt, rw, tps_nama,
     alasan, dicatat_oleh, dicatat_oleh_nama)
  values (p_periode, w.id, w.nama_lengkap,
          left(w.nik, 4) || repeat('*', greatest(length(w.nik) - 6, 0)) || right(w.nik, 2),
          w.jenis_kelamin, w.dusun, w.rt, w.rw, v_tps.nama, trim(p_alasan), auth.uid(), v_nama)
  returning id into v_id;

  perform public.pilkades_catat(p_periode, 'tambah_pemilih_tambahan',
    w.nama_lengkap || ' - ' || v_tps.nama || ' - ' || trim(p_alasan));
  return v_id;
end;
$$;
revoke execute on function public.pilkades_tambah_pemilih(uuid, uuid, uuid, text) from public, anon;
grant  execute on function public.pilkades_tambah_pemilih(uuid, uuid, uuid, text) to authenticated;

create or replace function public.pilkades_batal_tambahan(p_id uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare r public.pilkades_pemilih_tambahan%rowtype;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_alasan is null or length(trim(p_alasan)) < 5 then
    raise exception 'Alasan wajib diisi (minimal 5 huruf).';
  end if;
  select * into r from public.pilkades_pemilih_tambahan where id = p_id;
  if not found then raise exception 'Data tidak ditemukan.'; end if;
  if exists (select 1 from public.pilkades_hadir where periode_id = r.periode_id and warga_id = r.warga_id) then
    raise exception 'Pemilih ini sudah tercatat hadir, jadi tidak bisa dibatalkan.';
  end if;
  delete from public.pilkades_pemilih_tambahan where id = p_id;
  perform public.pilkades_catat(r.periode_id, 'batal_pemilih_tambahan', r.nama_lengkap || ' - ' || trim(p_alasan));
end;
$$;
revoke execute on function public.pilkades_batal_tambahan(uuid, text) from public, anon;
grant  execute on function public.pilkades_batal_tambahan(uuid, text) to authenticated;

-- Daftar hadir menerima Pemilih Tambahan (diganti dari 0054) ---------------------------------
create or replace function public.pilkades_catat_hadir(p_periode uuid, p_warga uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_daftar uuid;
  v_isi public.pilkades_daftar_tetap_isi%rowtype;
  v_tmb public.pilkades_pemilih_tambahan%rowtype;
  v_nama_h text;
  v_tps_h text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;

  select id into v_daftar from public.pilkades_daftar_tetap
  where periode_id = p_periode and jenis = 'DPT'
  order by versi desc limit 1;
  if v_daftar is null then
    raise exception 'DPT belum ditetapkan';
  end if;

  select * into v_isi from public.pilkades_daftar_tetap_isi
  where daftar_id = v_daftar and warga_id = p_warga;
  if not found then
    -- Bukan di DPT: boleh bila tercatat sebagai Pemilih Tambahan.
    select * into v_tmb from public.pilkades_pemilih_tambahan
    where periode_id = p_periode and warga_id = p_warga;
    if not found then
      raise exception 'Pemilih tidak ada di DPT maupun daftar Pemilih Tambahan';
    end if;
    v_nama_h := v_tmb.nama_lengkap;
    v_tps_h := v_tmb.tps_nama;
  else
    v_nama_h := v_isi.nama_lengkap;
    v_tps_h := v_isi.tps_nama;
  end if;

  begin
    insert into public.pilkades_hadir
      (periode_id, warga_id, nama_lengkap, tps_nama, dicatat_oleh, dicatat_oleh_nama)
    values
      (p_periode, p_warga, v_nama_h, v_tps_h, auth.uid(),
       (select nama from public.profiles where id = auth.uid()));
  exception when unique_violation then
    raise exception 'Pemilih sudah tercatat hadir';
  end;
end;
$$;

revoke execute on function public.pilkades_catat_hadir(uuid, uuid) from public, anon;
grant  execute on function public.pilkades_catat_hadir(uuid, uuid) to authenticated;

-- 3. Sambungan data penduduk ---------------------------------------------------------------------
-- Hanya sebelum DPT. Tidak menimpa pemilih "Memenuhi syarat"/"Tidak memenuhi" hasil keputusan manual,
-- KECUALI penduduk yang sudah meninggal/pindah (itu pasti tidak boleh masuk daftar).
create or replace function public.pilkades_sinkron_penduduk(p_periode uuid)
returns table (tidak_aktif integer, baru_datang integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_acuan date;
  v_a integer;
  v_b integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if public.pilkades_dpt_ada(p_periode) then
    raise exception 'DPT sudah ditetapkan, data pemilih terkunci.';
  end if;
  select coalesce(tanggal_pemungutan, current_date) into v_acuan
  from public.pilkades_periode where id = p_periode;
  if v_acuan is null then raise exception 'Periode tidak ditemukan.'; end if;

  -- (a) meninggal / pindah keluar -> Tidak memenuhi syarat
  with u as (
    update public.pilkades_pemilih pm
    set status_verifikasi = 'tidak_memenuhi',
        status_otomatis = false,
        catatan = 'Otomatis: penduduk ' ||
                  case w.status_kependudukan when 'meninggal' then 'meninggal' else 'pindah keluar' end ||
                  coalesce(' pada ' || to_char(w.tanggal_status, 'DD-MM-YYYY'), ''),
        diverifikasi_oleh = auth.uid(),
        diverifikasi_pada = now()
    from public.warga w
    where pm.warga_id = w.id and pm.periode_id = p_periode
      and w.status_kependudukan <> 'aktif'
      and pm.status_verifikasi <> 'tidak_memenuhi'
    returning pm.id
  )
  select count(*) into v_a from u;

  -- (b) baru datang < 6 bulan sebelum hari pemungutan -> Perlu dicek (hanya yang belum diperiksa)
  with u as (
    update public.pilkades_pemilih pm
    set status_verifikasi = 'perlu_dicek',
        status_otomatis = false,
        catatan = 'Otomatis: datang ' || to_char(d.tgl, 'DD-MM-YYYY') ||
                  ', kurang dari 6 bulan sebelum hari pemungutan. Periksa domisilinya.',
        diverifikasi_oleh = auth.uid(),
        diverifikasi_pada = now()
    from (
      select m.warga_id, max(m.tanggal) as tgl
      from public.mutasi_penduduk m
      where m.jenis = 'datang' and m.dibatalkan_pada is null
      group by m.warga_id
    ) d
    where pm.warga_id = d.warga_id and pm.periode_id = p_periode
      and pm.status_verifikasi = 'belum'
      and d.tgl > (v_acuan - interval '6 months')::date
    returning pm.id
  )
  select count(*) into v_b from u;

  perform public.pilkades_catat(p_periode, 'sinkron_penduduk',
    v_a || ' meninggal/pindah ditandai tidak memenuhi, ' || v_b || ' baru datang (<6 bulan) ditandai perlu dicek');
  return query select v_a, v_b;
end;
$$;
revoke execute on function public.pilkades_sinkron_penduduk(uuid) from public, anon;
grant  execute on function public.pilkades_sinkron_penduduk(uuid) to authenticated;

commit;

-- ROLLBACK (manual):
--   drop trigger if exists pilkades_pemilih_kunci_dpt on public.pilkades_pemilih;
--   drop trigger if exists pilkades_tps_kunci_dpt on public.pilkades_tps;
--   drop function if exists public.pilkades_sinkron_penduduk(uuid);
--   (tabel pilkades_pemilih_tambahan boleh dibiarkan; kembalikan fungsi dari 0058 dan 0054 bila perlu)
