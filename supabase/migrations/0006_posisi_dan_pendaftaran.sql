-- Fase 1c: Sistem slot posisi untuk role banyak-wilayah (Kadus, Ketua RT).
-- Kepala Desa/Sekdes/Kaur/Kasi TETAP dibuat manual oleh admin lewat Supabase
-- Dashboard (tidak berubah dari 0001/0002). Migration ini KHUSUS menambahkan
-- jalur pendaftaran mandiri untuk Kadus & Ketua RT, dengan slot per wilayah
-- supaya tidak ada duplikasi. Jalankan SETELAH 0001-0005.

-- 1. Perluas daftar role yang valid: tambah 'ketua_rt'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('kepala_desa', 'sekretaris_desa', 'kaur', 'kasi', 'kadus', 'ketua_rt'));

-- 2. Slot posisi per wilayah. Admin isi dulu daftar wilayah (dusun/RT-RW)
--    sebagai slot KOSONG, sebelum pendaftaran mandiri dibuka untuk wilayah itu.
create table if not exists public.posisi_perangkat (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('kadus', 'ketua_rt')),
  wilayah text not null, -- "Dusun 1", "RT 01/RW 02", dst
  status text not null default 'kosong' check (status in ('kosong', 'terisi')),
  profile_id uuid references public.profiles (id),
  diisi_pada timestamptz,
  dikosongkan_oleh uuid references public.profiles (id),
  dikosongkan_pada timestamptz,
  created_at timestamptz not null default now(),
  unique (role, wilayah)
);

alter table public.posisi_perangkat enable row level security;

drop policy if exists "Staf bisa kelola posisi perangkat" on public.posisi_perangkat;
create policy "Staf bisa kelola posisi perangkat"
  on public.posisi_perangkat for all
  to authenticated
  using (true)
  with check (true);

-- View terbatas untuk publik: hanya role/wilayah/status, TANPA profile_id
-- (supaya tidak bocorkan siapa pemegang slot ke publik yang belum login).
create or replace view public.posisi_perangkat_publik as
  select id, role, wilayah, status
  from public.posisi_perangkat;

grant select on public.posisi_perangkat_publik to anon, authenticated;

-- 3. Pendaftaran mandiri (khusus Kadus & Ketua RT).
create table if not exists public.pendaftaran_akun (
  id uuid primary key default gen_random_uuid(),
  posisi_id uuid not null references public.posisi_perangkat (id),
  nama_lengkap text not null,
  nik text not null check (nik ~ '^\d{16}$'),
  no_hp text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'disetujui', 'ditolak')),
  catatan_admin text,
  tanggal_daftar timestamptz not null default now(),
  diproses_oleh uuid references public.profiles (id),
  tanggal_diproses timestamptz
);

alter table public.pendaftaran_akun enable row level security;

-- Siapapun (calon Kadus/RT, belum punya akun) boleh insert pendaftaran baru.
drop policy if exists "Publik bisa daftar posisi" on public.pendaftaran_akun;
create policy "Publik bisa daftar posisi"
  on public.pendaftaran_akun for insert
  to anon, authenticated
  with check (true);

-- Hanya staf yang login yang bisa lihat & proses antrian pendaftaran.
drop policy if exists "Staf bisa kelola pendaftaran" on public.pendaftaran_akun;
create policy "Staf bisa kelola pendaftaran"
  on public.pendaftaran_akun for all
  to authenticated
  using (true)
  with check (true);

-- 4. WAJIB: tolak otomatis kalau slot yang didaftar sudah terisi saat
--    pendaftaran di-submit — sesuai kesepakatan, jangan sampai masuk
--    antrian approval sama sekali kalau slotnya sudah ada pemiliknya.
create or replace function public.cegah_daftar_slot_terisi()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from public.posisi_perangkat where id = new.posisi_id;

  if v_status is null then
    raise exception 'Posisi/wilayah tidak ditemukan.';
  end if;

  if v_status = 'terisi' then
    raise exception 'SLOT_TERISI: Posisi untuk wilayah ini sudah terisi. Hubungi admin desa.';
  end if;

  return new;
end;
$$;

drop trigger if exists cegah_daftar_slot_terisi_trigger on public.pendaftaran_akun;
create trigger cegah_daftar_slot_terisi_trigger
  before insert on public.pendaftaran_akun
  for each row execute procedure public.cegah_daftar_slot_terisi();

-- 5. Catatan penting soal alur APPROVE (dilakukan di kode aplikasi, bukan
--    murni SQL): saat admin approve pendaftaran, aplikasi (server action
--    dengan Supabase Secret Key) akan:
--      a. Membuat akun Supabase Auth baru untuk pendaftar (email + password
--         sementara), dengan user_metadata { nama, role, jabatan, dusun/
--         wilayah } — trigger handle_new_user (migration 0001/0002) otomatis
--         bikin baris di `profiles`.
--      b. Update posisi_perangkat: status = 'terisi', profile_id = <user baru>,
--         diisi_pada = now().
--      c. Update pendaftaran_akun: status = 'disetujui'.
--    Lihat app/dashboard/pendaftaran/actions.js untuk implementasinya.
--    "Kosongkan Slot" (hanya admin) = set status='kosong', profile_id=null,
--    dikosongkan_oleh & dikosongkan_pada terisi.
