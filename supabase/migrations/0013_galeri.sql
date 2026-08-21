-- Fase 5 - Galeri Kegiatan Desa.
-- Admin (perangkat desa) mengunggah foto kegiatan + judul + rincian
-- (opsional) lewat /dashboard/galeri. Hasilnya tampil di beranda publik
-- dan halaman /galeri, sesuai aturan #7 di docs/AI_HANDOFF.md (tidak ada
-- data hardcode, semua diisi admin lewat panel).
-- Jalankan SETELAH 0001-0012.

create extension if not exists pgcrypto;

create table if not exists public.galeri_kegiatan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text, -- rincian kegiatan, opsional
  foto_url text not null, -- URL publik di Supabase Storage bucket "desa-media"
  urutan int not null default 0, -- untuk geser urutan manual di masa depan (opsional, default 0 = urut dari terbaru)
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists galeri_kegiatan_created_at_idx
  on public.galeri_kegiatan (created_at desc);

alter table public.galeri_kegiatan enable row level security;

-- Beranda & halaman galeri publik (tanpa login) WAJIB bisa baca semua foto.
drop policy if exists "Publik bisa lihat galeri kegiatan" on public.galeri_kegiatan;
create policy "Publik bisa lihat galeri kegiatan"
  on public.galeri_kegiatan for select
  to anon, authenticated
  using (true);

-- Staf yang login (perangkat desa) bisa kelola galeri (tambah/hapus). Sama
-- seperti modul lain (jenis_layanan_master, config_desa), belum ada tabel
-- hak-akses per-role terpisah, jadi semua staf login dianggap perangkat
-- desa terpercaya.
drop policy if exists "Staf bisa kelola galeri kegiatan" on public.galeri_kegiatan;
create policy "Staf bisa kelola galeri kegiatan"
  on public.galeri_kegiatan for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists set_galeri_kegiatan_updated_at on public.galeri_kegiatan;
create trigger set_galeri_kegiatan_updated_at
  before update on public.galeri_kegiatan
  for each row execute procedure public.set_updated_at();

-- Catatan: TIDAK bikin bucket storage baru — foto galeri disimpan di bucket
-- "desa-media" yang sudah ada (lihat 0010_config_desa.sql), dengan prefix
-- nama file "galeri-" supaya gampang dibedakan dari foto latar beranda/logo.
-- Kebijakan bucket itu (publik-baca, staf-tulis) sudah berlaku otomatis
-- untuk file baru ini, tidak perlu policy storage tambahan.
