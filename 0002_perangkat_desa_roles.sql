-- Fase 1b: perluas role dari 2 pilihan (admin/petugas) menjadi struktur
-- perangkat desa standar. Jalankan SETELAH 0001_init_profiles.sql.
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1. Lepas dulu batasan role yang lama.
alter table public.profiles drop constraint if exists profiles_role_check;

-- 2. Tambah kolom jabatan (label bebas, misalnya "Kaur Keuangan",
--    "Kasi Pemerintahan", "Kepala Dusun 1") dan dusun (khusus Kadus,
--    dipakai nanti untuk membatasi akses data per wilayah dusun).
alter table public.profiles
  add column if not exists jabatan text,
  add column if not exists dusun text;

-- 3. Pasang batasan role yang baru: 5 kelompok perangkat desa.
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('kepala_desa', 'sekretaris_desa', 'kaur', 'kasi', 'kadus'));

-- 4. Perbarui trigger: default role jadi 'kasi' (paling sering dipakai
--    untuk akun baru — pelaksana teknis yang proses pengajuan warga).
--    Nama & jabatan bisa diisi lewat "User Metadata" saat Add user di
--    Supabase Dashboard, format JSON: {"nama": "Budi", "jabatan": "Kaur Keuangan", "role": "kaur"}
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nama, role, jabatan, dusun)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'kasi'),
    new.raw_user_meta_data ->> 'jabatan',
    new.raw_user_meta_data ->> 'dusun'
  );
  return new;
end;
$$;

-- 5. Kalau akun admin pertama (dibuat sebelum migrasi ini) masih
--    role = 'admin', ubah manual jadi role yang sesuai, misalnya:
--    update public.profiles set role = 'kepala_desa', jabatan = 'Kepala Desa'
--    where id = '<uuid-akun-pertama-anda>';
--    (cari uuid-nya di Table Editor -> profiles)
