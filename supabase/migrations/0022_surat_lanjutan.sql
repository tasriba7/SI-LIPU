-- Fase 2 - Modul 4 (lanjutan 2): penomoran otomatis, surat untuk pengajuan LAMA,
-- nomor surat di cek status publik, tanda tangan & stempel gambar.
-- Jalankan SETELAH 0020 dan 0021. Aman dijalankan ulang.

-- 1. PENOMORAN OTOMATIS ---------------------------------------------------------
-- Format per template. Penanda yang dikenali:
--   {urut} 7        {urut3} 007      {bulan} 09      {bulan_romawi} IX      {tahun} 2026
-- Contoh: '470/{urut3}/DS/{bulan_romawi}/{tahun}' -> 470/013/DS/X/2026
-- Kosong = penomoran manual (admin mengetik nomor sendiri).
-- kelompok_nomor: template dengan kelompok SAMA berbagi satu urutan (buku agenda
-- tunggal, default 'umum'). Beri kelompok berbeda (mis. 'kelahiran') bila ingin
-- urutan terpisah. Urutan di-reset per tahun (berdasarkan tanggal surat).
alter table public.template_surat add column if not exists format_nomor text not null default '';
alter table public.template_surat add column if not exists kelompok_nomor text not null default 'umum';

update public.template_surat
set format_nomor = '470/{urut3}/DS/{bulan_romawi}/{tahun}'
where btrim(format_nomor) = '';

create table if not exists public.counter_nomor_surat (
  kelompok text not null,
  tahun int not null,
  terakhir int not null default 0,
  primary key (kelompok, tahun)
);
-- RLS aktif TANPA policy: tabel hanya disentuh lewat fungsi security definer di bawah.
alter table public.counter_nomor_surat enable row level security;

create or replace function public.format_nomor_surat(p_format text, p_urut int, p_tanggal date)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(
    p_format,
    '{urut3}', lpad(p_urut::text, 3, '0')),
    '{urut}', p_urut::text),
    '{bulan_romawi}', (array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[extract(month from p_tanggal)::int]),
    '{bulan}', lpad(extract(month from p_tanggal)::int::text, 2, '0')),
    '{tahun}', extract(year from p_tanggal)::int::text)
$$;

-- Melihat nomor BERIKUTNYA tanpa memakainya (untuk petunjuk di editor).
create or replace function public.intip_nomor_surat(p_template_id uuid, p_tanggal date)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t record;
  v_terakhir int;
begin
  if not public.akses_tulis_penuh() then
    raise exception 'Tidak berwenang';
  end if;
  select format_nomor, kelompok_nomor into t from public.template_surat where id = p_template_id;
  if not found or btrim(t.format_nomor) = '' then
    return null;
  end if;
  select terakhir into v_terakhir from public.counter_nomor_surat
   where kelompok = t.kelompok_nomor and tahun = extract(year from p_tanggal)::int;
  return public.format_nomor_surat(t.format_nomor, coalesce(v_terakhir, 0) + 1, p_tanggal);
end;
$$;

-- Mengambil & MEMAKAI nomor berikutnya. Atomik: dua petugas yang menyimpan
-- bersamaan tidak akan pernah mendapat nomor sama (baris counter terkunci).
create or replace function public.ambil_nomor_surat(p_template_id uuid, p_tanggal date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  v_urut int;
begin
  if not public.akses_tulis_penuh() then
    raise exception 'Tidak berwenang';
  end if;
  select format_nomor, kelompok_nomor into t from public.template_surat where id = p_template_id;
  if not found or btrim(t.format_nomor) = '' then
    return null;
  end if;
  insert into public.counter_nomor_surat (kelompok, tahun, terakhir)
  values (t.kelompok_nomor, extract(year from p_tanggal)::int, 1)
  on conflict (kelompok, tahun)
  do update set terakhir = public.counter_nomor_surat.terakhir + 1
  returning terakhir into v_urut;
  return public.format_nomor_surat(t.format_nomor, v_urut, p_tanggal);
end;
$$;

grant execute on function public.intip_nomor_surat(uuid, date) to authenticated;
grant execute on function public.ambil_nomor_surat(uuid, date) to authenticated;

-- Memulai urutan dari angka tertentu (mis. desa sudah sampai nomor 12 tahun ini):
--   insert into public.counter_nomor_surat (kelompok, tahun, terakhir) values ('umum', 2026, 12)
--   on conflict (kelompok, tahun) do update set terakhir = excluded.terakhir;

-- 2. SURAT UNTUK PENGAJUAN LAMA (pengajuan_surat) -----------------------------------
alter table public.surat_terbit alter column pengajuan_id drop not null;
alter table public.surat_terbit
  add column if not exists pengajuan_surat_id uuid unique
  references public.pengajuan_surat (id) on delete restrict;

alter table public.surat_terbit drop constraint if exists surat_terbit_satu_sumber;
alter table public.surat_terbit
  add constraint surat_terbit_satu_sumber
  check (num_nonnulls(pengajuan_id, pengajuan_surat_id) = 1);

-- 3. NOMOR SURAT DI CEK STATUS PUBLIK -------------------------------------------------
-- Hanya nomor & tanggal terbit yang dibuka (butuh kode tracking). Isi surat dan
-- data pribadi TIDAK ikut (lihat docs/SECURITY.md).
drop function if exists public.cek_status_pengajuan_layanan(text);
create function public.cek_status_pengajuan_layanan(p_kode text)
returns table (
  kode_tracking text,
  nama_layanan text,
  nama_pemohon text,
  status text,
  catatan_admin text,
  created_at timestamptz,
  updated_at timestamptz,
  nomor_surat text,
  tanggal_surat date
)
language sql
security definer
set search_path = public
as $$
  select
    pl.kode_tracking,
    jlm.nama_layanan,
    case when pl.anonim then null else pl.nama_pemohon end,
    pl.status,
    pl.catatan_admin,
    pl.created_at,
    pl.updated_at,
    st.nomor_surat,
    st.tanggal_surat
  from public.pengajuan_layanan pl
  join public.jenis_layanan_master jlm on jlm.id = pl.jenis_layanan_id
  left join public.surat_terbit st on st.pengajuan_id = pl.id
  where pl.kode_tracking = p_kode;
$$;
grant execute on function public.cek_status_pengajuan_layanan(text) to anon, authenticated;

drop function if exists public.cek_status_pengajuan_surat(text);
create function public.cek_status_pengajuan_surat(p_kode text)
returns table (
  kode_tracking text,
  jenis_surat text,
  nama_pemohon text,
  status text,
  catatan_admin text,
  created_at timestamptz,
  updated_at timestamptz,
  nomor_surat text,
  tanggal_surat date
)
language sql
security definer
set search_path = public
as $$
  select ps.kode_tracking, ps.jenis_surat, ps.nama_pemohon, ps.status, ps.catatan_admin,
         ps.created_at, ps.updated_at, st.nomor_surat, st.tanggal_surat
  from public.pengajuan_surat ps
  left join public.surat_terbit st on st.pengajuan_surat_id = ps.id
  where ps.kode_tracking = p_kode;
$$;
grant execute on function public.cek_status_pengajuan_surat(text) to anon, authenticated;

-- 4. TANDA TANGAN & STEMPEL GAMBAR -----------------------------------------------------
-- Disimpan di bucket PRIVAT 'desa-ttd' (bukan 'desa-media' yang publik), karena
-- gambar tanda tangan rawan disalahgunakan. Tampil lewat signed URL berumur 1 jam,
-- hanya untuk staf yang login. Hanya Administrator yang boleh mengunggah.
alter table public.config_desa add column if not exists ttd_kades_path text;
alter table public.config_desa add column if not exists ttd_sekdes_path text;
alter table public.config_desa add column if not exists stempel_path text;

insert into storage.buckets (id, name, public)
values ('desa-ttd', 'desa-ttd', false)
on conflict (id) do nothing;

drop policy if exists "Staf bisa lihat ttd desa" on storage.objects;
create policy "Staf bisa lihat ttd desa"
  on storage.objects for select to authenticated
  using (bucket_id = 'desa-ttd');

drop policy if exists "Admin bisa unggah ttd desa" on storage.objects;
create policy "Admin bisa unggah ttd desa"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'desa-ttd' and public.adalah_admin());

drop policy if exists "Admin bisa ubah ttd desa" on storage.objects;
create policy "Admin bisa ubah ttd desa"
  on storage.objects for update to authenticated
  using (bucket_id = 'desa-ttd' and public.adalah_admin())
  with check (bucket_id = 'desa-ttd' and public.adalah_admin());

drop policy if exists "Admin bisa hapus ttd desa" on storage.objects;
create policy "Admin bisa hapus ttd desa"
  on storage.objects for delete to authenticated
  using (bucket_id = 'desa-ttd' and public.adalah_admin());
