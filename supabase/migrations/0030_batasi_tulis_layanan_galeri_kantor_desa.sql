-- 0030: Batasi penulisan jenis layanan & galeri ke perangkat KANTOR desa.
-- Idempotent (aman dijalankan ulang). Jalankan SETELAH 0001-0029.
--
-- Latar belakang: migrasi 0017 memakai boleh_tulis_staf() untuk tabel
-- jenis_layanan_master dan galeri_kegiatan. Fungsi itu ikut meloloskan 'kadus'
-- dan 'ketua_rt', padahal kedua tabel ini berlaku se-desa (bukan per wilayah).
-- Sidebar & halaman kini menyembunyikan menu tersebut untuk Kadus/Ketua RT
-- (lihat lib/roles.js: ROLE_KANTOR_DESA); migrasi ini menyamakan database
-- sebagai lapisan kedua, supaya tidak bisa ditembus lewat API langsung.
--
-- akses_tulis_penuh() = admin, sekretaris_desa, kaur, kasi (Kepala Desa tetap
-- hanya-lihat; Kadus & Ketua RT tidak termasuk). Aturan BACA tidak berubah.
--
-- Tidak mempengaruhi: pengajuan layanan/surat, data warga, dan "Buat Surat
-- Langsung" (memakai policy tabel lain).

begin;

drop policy if exists "Staf bisa tulis jenis layanan" on public.jenis_layanan_master;
create policy "Staf bisa tulis jenis layanan"
  on public.jenis_layanan_master for all to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

drop policy if exists "Staf bisa kelola galeri kegiatan" on public.galeri_kegiatan;
create policy "Staf bisa kelola galeri kegiatan"
  on public.galeri_kegiatan for all to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

commit;
