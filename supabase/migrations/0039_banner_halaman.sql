-- Banner gambar per menu publik (Panel Warga, Galeri, Pendaftaran, Profil, dst).
-- Admin mengunggah gambar lewat /dashboard/pengaturan-desa/banner-halaman;
-- gambar tampil di bawah header pada halaman terkait. Beranda TIDAK memakai
-- tabel ini — beranda tetap memakai config_desa.foto_url.
-- Jalankan SETELAH 0038. Tidak perlu bucket baru: memakai bucket "desa-media".

create table if not exists public.banner_halaman (
  halaman text primary key,        -- kunci menu, mis. 'galeri', 'profil', 'layanan'
  gambar_url text,                 -- URL publik di bucket "desa-media"; null = tanpa gambar
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.banner_halaman enable row level security;

-- Halaman publik (tanpa login) wajib bisa membaca banner.
drop policy if exists "Publik bisa lihat banner halaman" on public.banner_halaman;
create policy "Publik bisa lihat banner halaman"
  on public.banner_halaman for select
  to anon, authenticated
  using (true);

-- Hanya role admin yang boleh menambah/mengubah/menghapus banner.
drop policy if exists "Admin kelola banner halaman" on public.banner_halaman;
create policy "Admin kelola banner halaman"
  on public.banner_halaman for all
  to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

drop trigger if exists set_banner_halaman_updated_at on public.banner_halaman;
create trigger set_banner_halaman_updated_at
  before update on public.banner_halaman
  for each row execute procedure public.set_updated_at();
