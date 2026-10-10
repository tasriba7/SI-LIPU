-- Wisata Desa. Admin/perangkat kantor desa mengisi data destinasi lewat
-- /dashboard/wisata; tampil di beranda (bagian "Wisata Desa") dan halaman
-- publik /wisata (daftar) + /wisata/[id] (detail).
-- Jalankan SETELAH 0039. Foto memakai bucket "desa-media" yang sudah ada.

create extension if not exists pgcrypto;

create table if not exists public.wisata (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null default 'alam',   -- lihat KATEGORI_WISATA di lib/wisata.js
  deskripsi text,
  lokasi text,                             -- alamat / nama dusun
  jam_buka text,                           -- teks bebas, mis. "Setiap hari 08.00-17.00"
  tiket text,                              -- teks bebas, mis. "Rp5.000" atau "Gratis"
  kontak text,                             -- pengelola / nomor telepon
  maps_url text,                           -- tautan Google Maps (http/https)
  foto_url text,                           -- foto sampul, bucket "desa-media"
  unggulan boolean not null default false, -- diprioritaskan di beranda
  aktif boolean not null default true,     -- false = disembunyikan dari publik
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wisata_publik_idx
  on public.wisata (aktif, unggulan desc, created_at desc);

alter table public.wisata enable row level security;

-- Publik hanya melihat wisata yang aktif; staf kantor desa (termasuk Kepala
-- Desa yang hanya-lihat) juga melihat yang dinonaktifkan.
drop policy if exists "Publik lihat wisata aktif" on public.wisata;
create policy "Publik lihat wisata aktif"
  on public.wisata for select
  to anon, authenticated
  using (aktif = true or public.akses_penuh());

-- Tulis: admin, sekretaris desa, kaur, kasi (sama seperti galeri, lihat 0030).
drop policy if exists "Kantor desa kelola wisata" on public.wisata;
create policy "Kantor desa kelola wisata"
  on public.wisata for all
  to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

drop trigger if exists set_wisata_updated_at on public.wisata;
create trigger set_wisata_updated_at
  before update on public.wisata
  for each row execute procedure public.set_updated_at();
