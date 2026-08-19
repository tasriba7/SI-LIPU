-- Fase 2 - Modul 1: Pengajuan Surat Online
-- Warga mengajukan surat TANPA login lewat form publik, lalu dapat kode
-- tracking unik untuk cek status. Admin/petugas desa (sudah login lewat
-- /login, lihat 0001 & 0002) memproses pengajuan di /dashboard/surat.
-- Jalankan file ini di Supabase Dashboard -> SQL Editor -> New query -> Run,
-- SETELAH 0001_init_profiles.sql dan 0002_perangkat_desa_roles.sql.

create extension if not exists pgcrypto;

-- 1. Tabel pengajuan surat.
create table if not exists public.pengajuan_surat (
  id uuid primary key default gen_random_uuid(),
  kode_tracking text not null unique,
  jenis_surat text not null,
  nama_pemohon text not null,
  nik text not null,
  alamat text not null,
  no_hp text not null,
  keperluan text not null,
  status text not null default 'diajukan'
    check (status in ('diajukan', 'diproses', 'selesai', 'ditolak')),
  catatan_admin text,
  diproses_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pengajuan_surat_status_idx on public.pengajuan_surat (status);
create index if not exists pengajuan_surat_kode_idx on public.pengajuan_surat (kode_tracking);

-- 2. RLS: wajib aktif.
alter table public.pengajuan_surat enable row level security;

-- Warga (anon, tanpa akun) boleh mengirim pengajuan baru lewat form publik.
drop policy if exists "Warga bisa ajukan surat baru" on public.pengajuan_surat;
create policy "Warga bisa ajukan surat baru"
  on public.pengajuan_surat for insert
  to anon, authenticated
  with check (true);

-- Hanya staf desa yang login yang boleh melihat daftar lengkap (termasuk
-- NIK, alamat, dll). Warga cek status lewat RPC terbatas di bawah, BUKAN
-- lewat select tabel ini langsung.
drop policy if exists "Staf bisa lihat semua pengajuan" on public.pengajuan_surat;
create policy "Staf bisa lihat semua pengajuan"
  on public.pengajuan_surat for select
  to authenticated
  using (true);

drop policy if exists "Staf bisa update status pengajuan" on public.pengajuan_surat;
create policy "Staf bisa update status pengajuan"
  on public.pengajuan_surat for update
  to authenticated
  using (true);

-- 3. Trigger updated_at otomatis.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pengajuan_surat_updated_at on public.pengajuan_surat;
create trigger set_pengajuan_surat_updated_at
  before update on public.pengajuan_surat
  for each row execute procedure public.set_updated_at();

-- 4. RPC publik: warga cek status pakai kode tracking saja, tanpa expose
-- data pribadi lain (NIK, alamat, no HP) ke publik lewat select bebas.
-- security definer supaya bisa jalan walau RLS select membatasi ke
-- authenticated saja.
create or replace function public.cek_status_pengajuan_surat(p_kode text)
returns table (
  kode_tracking text,
  jenis_surat text,
  nama_pemohon text,
  status text,
  catatan_admin text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select kode_tracking, jenis_surat, nama_pemohon, status, catatan_admin, created_at, updated_at
  from public.pengajuan_surat
  where kode_tracking = p_kode;
$$;

grant execute on function public.cek_status_pengajuan_surat(text) to anon, authenticated;
