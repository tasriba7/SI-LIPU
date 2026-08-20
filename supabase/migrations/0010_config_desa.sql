-- Fase 2 - Tambahan: Pengaturan Desa (identitas instance).
-- Menyediakan tabel konfigurasi terpusat untuk nama desa/kelurahan, wilayah
-- administratif (kecamatan/kabupaten/provinsi), alamat kantor desa, dan foto
-- latar beranda — semua bisa diubah ADMIN lewat /dashboard/pengaturan-desa,
-- BUKAN di-hardcode di kode program (lihat aturan #7 di docs/AI_HANDOFF.md
-- dan docs/BRANDING.md bagian "config_desa").
-- Jalankan SETELAH 0001-0009.

create extension if not exists pgcrypto;

-- 1. Tabel konfigurasi desa. Sengaja dibuat SINGLETON (selalu 1 baris,
--    id dikunci = 1) karena satu instance SI-LIPU = satu desa/kelurahan.
create table if not exists public.config_desa (
  id smallint primary key default 1 check (id = 1),
  jenis_wilayah text not null default 'Desa'
    check (jenis_wilayah in ('Desa', 'Kelurahan')),
  nama_desa text,
  provinsi text,
  kabupaten text,
  kecamatan text,
  alamat text,
  foto_url text, -- URL publik foto latar beranda (Supabase Storage bucket "desa-media")
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.config_desa enable row level security;

-- Beranda publik (tanpa login) WAJIB bisa baca identitas desa.
drop policy if exists "Publik bisa lihat pengaturan desa" on public.config_desa;
create policy "Publik bisa lihat pengaturan desa"
  on public.config_desa for select
  to anon, authenticated
  using (true);

-- Staf yang login (perangkat desa) bisa ubah pengaturan desa.
-- Catatan: sama seperti modul lain (jenis_layanan_master, posisi_perangkat),
-- sistem ini belum punya tabel "hak akses per-role" terpisah, jadi semua
-- staf yang login dianggap perangkat desa terpercaya. Kalau ke depan perlu
-- dibatasi hanya Kepala Desa/Sekdes, tambahkan cek role di sini.
drop policy if exists "Staf bisa kelola pengaturan desa" on public.config_desa;
create policy "Staf bisa kelola pengaturan desa"
  on public.config_desa for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists set_config_desa_updated_at on public.config_desa;
create trigger set_config_desa_updated_at
  before update on public.config_desa
  for each row execute procedure public.set_updated_at();

-- Seed satu baris kosong supaya halaman admin & beranda tinggal UPDATE
-- (bukan INSERT) begitu Pengaturan Desa disimpan pertama kali.
insert into public.config_desa (id)
values (1)
on conflict (id) do nothing;

-- 2. Storage bucket untuk foto latar beranda (& media desa lain di masa
--    depan). Publik (bucket public=true) supaya foto bisa tampil di beranda
--    tanpa autentikasi, tapi upload/ubah/hapus tetap wajib login.
insert into storage.buckets (id, name, public)
values ('desa-media', 'desa-media', true)
on conflict (id) do nothing;

drop policy if exists "Publik bisa lihat media desa" on storage.objects;
create policy "Publik bisa lihat media desa"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'desa-media');

drop policy if exists "Staf bisa upload media desa" on storage.objects;
create policy "Staf bisa upload media desa"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'desa-media');

drop policy if exists "Staf bisa update media desa" on storage.objects;
create policy "Staf bisa update media desa"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'desa-media')
  with check (bucket_id = 'desa-media');

drop policy if exists "Staf bisa hapus media desa" on storage.objects;
create policy "Staf bisa hapus media desa"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'desa-media');
