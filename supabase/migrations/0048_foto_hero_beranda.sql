-- Foto latar beranda (hero) yang berganti otomatis. Admin menambah/menghapus/
-- mengurutkan foto lewat /dashboard/pengaturan-desa/foto-beranda.
-- Jalankan SETELAH 0047. Tidak perlu bucket baru: memakai bucket "desa-media".

create table if not exists public.foto_hero_beranda (
  id uuid primary key default gen_random_uuid(),
  gambar_url text not null,        -- URL publik di bucket "desa-media"
  urutan integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists foto_hero_beranda_urutan_idx
  on public.foto_hero_beranda (urutan, created_at);

alter table public.foto_hero_beranda enable row level security;

-- Beranda publik (tanpa login) wajib bisa membaca foto.
drop policy if exists "Publik bisa lihat foto hero beranda" on public.foto_hero_beranda;
create policy "Publik bisa lihat foto hero beranda"
  on public.foto_hero_beranda for select
  to anon, authenticated
  using (true);

-- Hanya role admin yang boleh menambah/mengubah/menghapus.
drop policy if exists "Admin kelola foto hero beranda" on public.foto_hero_beranda;
create policy "Admin kelola foto hero beranda"
  on public.foto_hero_beranda for all
  to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Foto latar lama (config_desa.foto_url) dipindahkan jadi foto pertama,
-- supaya foto yang sudah terpasang tidak hilang setelah migrasi.
insert into public.foto_hero_beranda (gambar_url, urutan)
select foto_url, 0
from public.config_desa
where id = 1
  and foto_url is not null
  and not exists (select 1 from public.foto_hero_beranda);
