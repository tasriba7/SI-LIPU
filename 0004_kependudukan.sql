-- Fase 2 - Modul 2: Kependudukan + lookup aman untuk auto-fill form warga.
-- Jalankan SETELAH 0001, 0002, 0003.
-- Implementasi ini WAJIB mengikuti docs/SECURITY.md — jangan ubah pola lookup
-- (NIK + Tanggal Lahir dua faktor, tanpa autocomplete, field terbatas) tanpa
-- membaca dokumen itu dulu.

create extension if not exists pgcrypto;

-- 1. Tabel warga (master kependudukan).
create table if not exists public.warga (
  id uuid primary key default gen_random_uuid(),
  nik text not null unique check (nik ~ '^\d{16}$'),
  no_kk text,
  nama_lengkap text not null,
  tempat_lahir text,
  tanggal_lahir date not null,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  alamat text,
  dusun text,
  rt text,
  rw text,
  status_kawin text,
  pekerjaan text,
  agama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warga_nik_idx on public.warga (nik);
create index if not exists warga_nama_idx on public.warga (nama_lengkap);

alter table public.warga enable row level security;

-- TIDAK ADA policy select untuk anon/publik sama sekali — sengaja. Warga
-- publik HANYA boleh akses data lewat RPC cari_warga_publik di bawah,
-- yang membatasi field & wajib dua faktor (NIK + Tanggal Lahir).
drop policy if exists "Staf bisa kelola data warga" on public.warga;
create policy "Staf bisa kelola data warga"
  on public.warga for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_warga_updated_at on public.warga;
create trigger set_warga_updated_at
  before update on public.warga
  for each row execute procedure public.set_updated_at();

-- 2. Log setiap percobaan pencarian (audit + dasar rate limiting).
--    Dipisah dari log_aktivitas staf karena ini datang dari publik/anonim.
create table if not exists public.log_pencarian_warga (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- hash/IP pemohon, dari Server Action (bukan dari klien)
  nik_dicoba text,
  berhasil boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists log_pencarian_identifier_idx
  on public.log_pencarian_warga (identifier, created_at);

alter table public.log_pencarian_warga enable row level security;

-- Hanya proses server (lewat RPC security definer) yang menulis log ini,
-- jadi tidak perlu policy insert untuk anon/authenticated sama sekali.
-- Staf boleh baca untuk audit.
drop policy if exists "Staf bisa baca log pencarian" on public.log_pencarian_warga;
create policy "Staf bisa baca log pencarian"
  on public.log_pencarian_warga for select
  to authenticated
  using (true);

-- 3. RPC pencarian warga dua faktor (NIK + Tanggal Lahir), dipanggil dari
--    Server Action (bukan langsung dari browser). Rate limiting dicek DI
--    Server Action (lib/lookupWarga.js) sebelum RPC ini dipanggil — RPC ini
--    sendiri tetap membatasi field yang di-return sesuai SECURITY.md poin 6.
create or replace function public.cari_warga_publik(
  p_nik text,
  p_tanggal_lahir date,
  p_identifier text
)
returns table (
  warga_id uuid,
  nama_lengkap text,
  dusun text,
  rt text,
  rw text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.warga%rowtype;
begin
  select * into v_row
  from public.warga w
  where w.nik = p_nik and w.tanggal_lahir = p_tanggal_lahir
  limit 1;

  -- Log SETIAP percobaan (berhasil maupun gagal) untuk audit.
  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_row.id is not null);

  if v_row.id is null then
    return; -- tidak ada baris dikembalikan = "tidak ditemukan", tanpa detail
  end if;

  return query
    select v_row.id, v_row.nama_lengkap, v_row.dusun, v_row.rt, v_row.rw;
end;
$$;

grant execute on function public.cari_warga_publik(text, date, text) to anon, authenticated;

-- 4. RPC hitung percobaan gagal untuk rate limiting (dipanggil Server Action
--    SEBELUM cari_warga_publik, supaya batas bisa dicek tanpa expose tabel
--    log langsung ke anon).
create or replace function public.hitung_percobaan_gagal(
  p_identifier text,
  p_menit int default 15
)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.log_pencarian_warga
  where identifier = p_identifier
    and berhasil = false
    and created_at > now() - (p_menit || ' minutes')::interval;
$$;

grant execute on function public.hitung_percobaan_gagal(text, int) to anon, authenticated;
