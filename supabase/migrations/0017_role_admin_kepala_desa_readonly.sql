-- 0017: Role "admin" + Kepala Desa menjadi hanya-lihat (read-only).
-- Jalankan SETELAH 0001-0016 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent).
--
-- RINGKASAN
--   * Role baru  : admin  -> satu-satunya yang boleh Kelola Akun, Pengaturan Desa,
--                            Slot Posisi, Pendaftaran Akun, dan semua tulis data.
--   * kepala_desa: HANYA LIHAT. Tidak bisa tambah/ubah/hapus apa pun (dijaga di
--                  database lewat RLS, bukan hanya di tampilan).
--   * Akun kepala_desa yang selama ini Anda pakai sebagai "admin" otomatis diubah
--     menjadi role admin (kalau di database hanya ada SATU akun kepala_desa dan
--     belum ada admin). Akun Kepala Desa yang sebenarnya dibuat baru lewat
--     Kelola Akun Staf, atau lewat slot + pendaftaran (role kepala_desa).
--   * Sekdes, Kaur, Kasi, Kadus, Ketua RT: hak tulis seperti sebelumnya.
--   * Celah profiles: user tidak bisa lagi mengubah role/dusun/jabatan dirinya sendiri.

-- ---------------------------------------------------------------------------
-- 1. Daftar role & slot yang valid
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'kepala_desa', 'sekretaris_desa', 'kaur', 'kasi', 'kadus', 'ketua_rt'));

-- Kepala Desa boleh didaftarkan lewat slot, seperti Kadus/Ketua RT.
alter table public.posisi_perangkat drop constraint if exists posisi_perangkat_role_check;
alter table public.posisi_perangkat
  add constraint posisi_perangkat_role_check
  check (role in ('kadus', 'ketua_rt', 'kepala_desa'));

-- ---------------------------------------------------------------------------
-- 2. Ubah akun yang selama ini dipakai sebagai admin (role kepala_desa) -> admin
--    Hanya jalan jika belum ada admin dan hanya ada tepat 1 akun kepala_desa.
-- ---------------------------------------------------------------------------
do $$
declare
  v_n int;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise notice 'Sudah ada akun admin, akun kepala_desa tidak diubah.';
    return;
  end if;

  select count(*) into v_n from public.profiles where role = 'kepala_desa';

  if v_n = 1 then
    update public.profiles
       set role = 'admin', jabatan = 'Administrator'
     where role = 'kepala_desa';
    raise notice 'Akun kepala_desa berhasil diubah menjadi admin.';
  else
    raise notice
      'Ditemukan % akun kepala_desa. Tidak diubah otomatis. Ubah manual: update public.profiles set role = ''admin'', jabatan = ''Administrator'' where id = ''<uuid-akun-anda>'';',
      v_n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Fungsi bantu
-- ---------------------------------------------------------------------------
create or replace function public.adalah_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = auth.uid()), false)
$$;

-- Boleh MELIHAT semua data warga (termasuk Kepala Desa yang read-only).
create or replace function public.akses_penuh()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role in ('admin', 'kepala_desa', 'sekretaris_desa', 'kaur', 'kasi')
       from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Boleh MENULIS semua data warga (tanpa batas wilayah). Kepala Desa tidak termasuk.
create or replace function public.akses_tulis_penuh()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role in ('admin', 'sekretaris_desa', 'kaur', 'kasi')
       from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Staf yang boleh mengubah data umum (layanan, surat, galeri, media):
-- semua role kecuali Kepala Desa.
create or replace function public.boleh_tulis_staf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role in ('admin', 'sekretaris_desa', 'kaur', 'kasi', 'kadus', 'ketua_rt')
       from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

create or replace function public.boleh_ubah_warga(p_dusun text, p_rt text, p_rw text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.akses_tulis_penuh()
      or (public.role_saya() in ('kadus', 'ketua_rt')
          and public.wilayah_cocok(p_dusun, p_rt, p_rw))
$$;

grant execute on function public.adalah_admin() to authenticated;
grant execute on function public.akses_tulis_penuh() to authenticated;
grant execute on function public.boleh_tulis_staf() to authenticated;
grant execute on function public.boleh_ubah_warga(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. profiles: kunci kolom role/dusun/jabatan dari perubahan oleh user sendiri
--    (sebelumnya policy update-sendiri membuka celah naik role lewat API).
--    Perubahan lewat Secret Key / SQL Editor (auth.uid() null) tetap diizinkan.
-- ---------------------------------------------------------------------------
create or replace function public.kunci_kolom_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.adalah_admin() then
    new.role := old.role;
    new.dusun := old.dusun;
    new.jabatan := old.jabatan;
  end if;
  return new;
end;
$$;

drop trigger if exists kunci_kolom_profil_trigger on public.profiles;
create trigger kunci_kolom_profil_trigger
  before update on public.profiles
  for each row execute procedure public.kunci_kolom_profil();

-- ---------------------------------------------------------------------------
-- 5. warga & keluarga: lihat = akses_penuh/wilayah, tulis = tanpa Kepala Desa
-- ---------------------------------------------------------------------------
drop policy if exists "warga_tambah" on public.warga;
drop policy if exists "warga_ubah" on public.warga;
drop policy if exists "warga_hapus" on public.warga;

create policy "warga_tambah"
  on public.warga for insert to authenticated
  with check (public.boleh_ubah_warga(dusun, rt, rw));

create policy "warga_ubah"
  on public.warga for update to authenticated
  using (public.boleh_ubah_warga(dusun, rt, rw))
  with check (public.boleh_ubah_warga(dusun, rt, rw));

create policy "warga_hapus"
  on public.warga for delete to authenticated
  using (
    public.akses_tulis_penuh()
    or (public.role_saya() in ('kadus', 'ketua_rt')
        and public.wilayah_cocok(dusun, rt, rw)
        and dibuat_oleh = auth.uid())
  );

drop policy if exists "keluarga_kelola" on public.keluarga;
create policy "keluarga_kelola"
  on public.keluarga for all to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

-- ---------------------------------------------------------------------------
-- 6. Pengajuan layanan & surat: semua staf boleh LIHAT, Kepala Desa tidak boleh UBAH
-- ---------------------------------------------------------------------------
drop policy if exists "Staf bisa update status pengajuan" on public.pengajuan_surat;
create policy "Staf bisa update status pengajuan"
  on public.pengajuan_surat for update to authenticated
  using (public.boleh_tulis_staf())
  with check (public.boleh_tulis_staf());

drop policy if exists "Staf bisa update pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa update pengajuan layanan"
  on public.pengajuan_layanan for update to authenticated
  using (public.boleh_tulis_staf())
  with check (public.boleh_tulis_staf());

-- ---------------------------------------------------------------------------
-- 7. Jenis layanan (form builder) & galeri: baca semua staf, tulis tanpa Kepala Desa
-- ---------------------------------------------------------------------------
drop policy if exists "Staf bisa kelola jenis layanan" on public.jenis_layanan_master;
drop policy if exists "Staf bisa lihat semua jenis layanan" on public.jenis_layanan_master;
drop policy if exists "Staf bisa tulis jenis layanan" on public.jenis_layanan_master;

-- Staf perlu melihat juga layanan yang non-aktif.
create policy "Staf bisa lihat semua jenis layanan"
  on public.jenis_layanan_master for select to authenticated
  using (true);

create policy "Staf bisa tulis jenis layanan"
  on public.jenis_layanan_master for all to authenticated
  using (public.boleh_tulis_staf())
  with check (public.boleh_tulis_staf());

drop policy if exists "Staf bisa kelola galeri kegiatan" on public.galeri_kegiatan;
create policy "Staf bisa kelola galeri kegiatan"
  on public.galeri_kegiatan for all to authenticated
  using (public.boleh_tulis_staf())
  with check (public.boleh_tulis_staf());

-- ---------------------------------------------------------------------------
-- 8. Pengaturan desa, slot posisi, pendaftaran akun: HANYA admin yang menulis
-- ---------------------------------------------------------------------------
drop policy if exists "Staf bisa kelola pengaturan desa" on public.config_desa;
create policy "Staf bisa kelola pengaturan desa"
  on public.config_desa for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

drop policy if exists "Staf bisa kelola posisi perangkat" on public.posisi_perangkat;
drop policy if exists "Staf bisa lihat posisi perangkat" on public.posisi_perangkat;
drop policy if exists "Admin bisa kelola posisi perangkat" on public.posisi_perangkat;

create policy "Staf bisa lihat posisi perangkat"
  on public.posisi_perangkat for select to authenticated
  using (true);

create policy "Admin bisa kelola posisi perangkat"
  on public.posisi_perangkat for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Antrian pendaftaran berisi NIK, HP, email calon staf: hanya admin.
-- (Policy insert publik "Publik bisa daftar posisi" tidak diubah.)
drop policy if exists "Staf bisa kelola pendaftaran" on public.pendaftaran_akun;
create policy "Admin bisa kelola pendaftaran"
  on public.pendaftaran_akun for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- ---------------------------------------------------------------------------
-- 9. Storage bucket desa-media: upload/ubah/hapus tanpa Kepala Desa
-- ---------------------------------------------------------------------------
drop policy if exists "Staf bisa upload media desa" on storage.objects;
create policy "Staf bisa upload media desa"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'desa-media' and public.boleh_tulis_staf());

drop policy if exists "Staf bisa update media desa" on storage.objects;
create policy "Staf bisa update media desa"
  on storage.objects for update to authenticated
  using (bucket_id = 'desa-media' and public.boleh_tulis_staf())
  with check (bucket_id = 'desa-media' and public.boleh_tulis_staf());

drop policy if exists "Staf bisa hapus media desa" on storage.objects;
create policy "Staf bisa hapus media desa"
  on storage.objects for delete to authenticated
  using (bucket_id = 'desa-media' and public.boleh_tulis_staf());
