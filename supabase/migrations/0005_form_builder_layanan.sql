-- Fase 2 - Modul 3: Form Builder ("Ajukan Layanan" generik).
-- Menggantikan pola hardcode ala pengajuan_surat dengan sistem generik yang
-- bisa ditambah admin sendiri lewat panel, tanpa developer & tanpa deploy
-- ulang. Jalankan SETELAH 0001-0004.
--
-- CATATAN: tabel pengajuan_surat (migration 0003) TETAP ada & tetap jalan
-- untuk data lama / kompatibilitas link /layanan/surat yang sudah ada.
-- Modul baru (jenis layanan tambahan di luar surat) sebaiknya lewat sistem
-- generik ini. Lihat docs/AI_HANDOFF.md untuk arah migrasi jangka panjang.

create extension if not exists pgcrypto;

-- 1. Daftar jenis layanan yang bisa diajukan warga — diisi & dikelola ADMIN
--    lewat /dashboard/jenis-layanan, BUKAN oleh developer.
create table if not exists public.jenis_layanan_master (
  id uuid primary key default gen_random_uuid(),
  kode_prefix text not null, -- prefix kode tracking, mis. "SRT", "ADU"
  nama_layanan text not null,
  kategori text not null default 'lainnya'
    check (kategori in ('surat', 'pengaduan', 'bansos', 'lainnya')),
  icon text not null default 'mail', -- lihat komponen icons.jsx untuk pilihan
  deskripsi text,
  butuh_lookup_warga boolean not null default true,
  -- form_schema: daftar field TAMBAHAN di luar field standar (nama, NIK,
  -- no HP, keterangan). Contoh isi & tipe field yang didukung ada di
  -- docs/DATABASE_SCHEMA.md.
  form_schema jsonb not null default '[]'::jsonb,
  aktif boolean not null default true,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jenis_layanan_master enable row level security;

-- Warga (anon) hanya boleh lihat jenis layanan yang AKTIF.
drop policy if exists "Publik bisa lihat layanan aktif" on public.jenis_layanan_master;
create policy "Publik bisa lihat layanan aktif"
  on public.jenis_layanan_master for select
  to anon
  using (aktif = true);

-- Staf yang login bisa lihat & kelola SEMUA (termasuk yang nonaktif).
drop policy if exists "Staf bisa kelola jenis layanan" on public.jenis_layanan_master;
create policy "Staf bisa kelola jenis layanan"
  on public.jenis_layanan_master for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists set_jenis_layanan_updated_at on public.jenis_layanan_master;
create trigger set_jenis_layanan_updated_at
  before update on public.jenis_layanan_master
  for each row execute procedure public.set_updated_at();

-- 2. Pengajuan generik — SATU tabel untuk SEMUA jenis layanan yang dibuat
--    lewat Form Builder (bukan bikin tabel baru tiap jenis layanan baru).
create table if not exists public.pengajuan_layanan (
  id uuid primary key default gen_random_uuid(),
  kode_tracking text not null unique,
  jenis_layanan_id uuid not null references public.jenis_layanan_master (id),
  warga_id uuid references public.warga (id), -- terisi otomatis kalau lookup NIK+TglLahir cocok
  nama_pemohon text not null,
  nik text not null,
  no_hp text not null,
  keterangan text, -- field umum: keperluan/isi keluhan/dst, tergantung jenis layanan
  data_tambahan jsonb not null default '{}'::jsonb, -- isian sesuai form_schema
  status text not null default 'diajukan'
    check (status in ('diajukan', 'diproses', 'selesai', 'ditolak')),
  catatan_admin text,
  diproses_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pengajuan_layanan_status_idx on public.pengajuan_layanan (status);
create index if not exists pengajuan_layanan_kode_idx on public.pengajuan_layanan (kode_tracking);
create index if not exists pengajuan_layanan_jenis_idx on public.pengajuan_layanan (jenis_layanan_id);

alter table public.pengajuan_layanan enable row level security;

drop policy if exists "Warga bisa ajukan layanan baru" on public.pengajuan_layanan;
create policy "Warga bisa ajukan layanan baru"
  on public.pengajuan_layanan for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Staf bisa lihat semua pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa lihat semua pengajuan layanan"
  on public.pengajuan_layanan for select
  to authenticated
  using (true);

drop policy if exists "Staf bisa update pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa update pengajuan layanan"
  on public.pengajuan_layanan for update
  to authenticated
  using (true);

drop trigger if exists set_pengajuan_layanan_updated_at on public.pengajuan_layanan;
create trigger set_pengajuan_layanan_updated_at
  before update on public.pengajuan_layanan
  for each row execute procedure public.set_updated_at();

-- 3. RPC publik cek status, gabung dengan nama layanan — pola sama seperti
--    cek_status_pengajuan_surat, tidak expose NIK/data pribadi lain.
create or replace function public.cek_status_pengajuan_layanan(p_kode text)
returns table (
  kode_tracking text,
  nama_layanan text,
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
  select
    pl.kode_tracking,
    jlm.nama_layanan,
    pl.nama_pemohon,
    pl.status,
    pl.catatan_admin,
    pl.created_at,
    pl.updated_at
  from public.pengajuan_layanan pl
  join public.jenis_layanan_master jlm on jlm.id = pl.jenis_layanan_id
  where pl.kode_tracking = p_kode;
$$;

grant execute on function public.cek_status_pengajuan_layanan(text) to anon, authenticated;

-- 4. Data awal: pindahkan jenis surat yang sudah ada (dari lib/jenisSurat.js)
--    supaya bisa langsung dikelola lewat Form Builder mulai sekarang, dan
--    tambahkan "Pengaduan Warga" yang sebelumnya cuma placeholder "segera
--    hadir" di halaman utama/dashboard.
insert into public.jenis_layanan_master (kode_prefix, nama_layanan, kategori, icon, butuh_lookup_warga, form_schema, aktif)
values
  ('SRT', 'Surat Keterangan Domisili', 'surat', 'mail', true, '[]'::jsonb, true),
  ('SRT', 'Surat Keterangan Tidak Mampu (SKTM)', 'surat', 'mail', true, '[]'::jsonb, true),
  ('SRT', 'Surat Keterangan Usaha', 'surat', 'mail', true,
    '[{"field_key":"nama_usaha","label":"Nama Usaha","tipe":"teks_pendek","wajib":true},
      {"field_key":"jenis_usaha","label":"Jenis Usaha","tipe":"pilihan","wajib":true,
       "opsi":["Kios/Toko","Warung Makan","Bengkel","Lainnya"]}]'::jsonb, true),
  ('SRT', 'Surat Pengantar KTP/KK', 'surat', 'mail', true, '[]'::jsonb, true),
  ('SRT', 'Surat Keterangan Kelahiran', 'surat', 'mail', true, '[]'::jsonb, true),
  ('SRT', 'Surat Keterangan Kematian', 'surat', 'mail', true, '[]'::jsonb, true),
  ('ADU', 'Pengaduan Warga', 'pengaduan', 'message', true, '[]'::jsonb, true)
on conflict do nothing;
