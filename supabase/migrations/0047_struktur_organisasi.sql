-- Struktur Organisasi Pemerintah Desa. Administrator mengisi tiap jabatan lewat
-- /dashboard/struktur-organisasi; tampil sebagai bagan (kepala desa di puncak,
-- bawahan di tingkat berikutnya) di beranda dan halaman publik
-- /struktur-organisasi.
-- Jalankan SETELAH 0046. Foto memakai bucket "desa-media" yang sudah ada.

create extension if not exists pgcrypto;

create table if not exists public.struktur_organisasi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,                      -- nama orang
  jabatan text not null,                   -- mis. "Kepala Desa", "Sekretaris Desa"
  foto_url text,                           -- bucket "desa-media"; null = tampil inisial
  atasan_id uuid references public.struktur_organisasi (id) on delete restrict,
                                           -- null = puncak bagan (Kepala Desa)
  urutan integer not null default 0,       -- urutan antar-saudara (kiri -> kanan)
  aktif boolean not null default true,     -- false = disembunyikan dari publik
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint struktur_bukan_atasan_sendiri check (atasan_id is null or atasan_id <> id)
);

create index if not exists struktur_organisasi_atasan_idx
  on public.struktur_organisasi (atasan_id, urutan);

alter table public.struktur_organisasi enable row level security;

-- Publik hanya melihat yang aktif; staf kantor desa juga melihat yang disembunyikan.
drop policy if exists "Publik lihat struktur organisasi aktif" on public.struktur_organisasi;
create policy "Publik lihat struktur organisasi aktif"
  on public.struktur_organisasi for select
  to anon, authenticated
  using (aktif = true or public.akses_penuh());

-- Tulis: hanya Administrator (menu ini khusus admin, lihat 0046).
drop policy if exists "Admin kelola struktur organisasi" on public.struktur_organisasi;
create policy "Admin kelola struktur organisasi"
  on public.struktur_organisasi for all
  to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

drop trigger if exists set_struktur_organisasi_updated_at on public.struktur_organisasi;
create trigger set_struktur_organisasi_updated_at
  before update on public.struktur_organisasi
  for each row execute procedure public.set_updated_at();
