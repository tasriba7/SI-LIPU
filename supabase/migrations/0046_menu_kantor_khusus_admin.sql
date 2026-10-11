-- 0046: Menu "kantor desa" menjadi KHUSUS ADMIN di tingkat database.
-- Jalankan SETELAH 0045. Idempotent (aman dijalankan ulang).
--
-- Sebelumnya (0030, 0040, 0041) tabel di bawah ini bisa DITULIS oleh
-- akses_tulis_penuh() = admin, sekretaris_desa, kaur, kasi. Kini hanya admin
-- (adalah_admin(), lihat 0017). Kode aplikasi sudah dibuat sama:
--   * sidebar/kartu menu : lib/menuDashboard.js (akses: "admin")
--   * halaman            : layout.js tiap folder -> jagaHalamanAdmin()
--   * server action      : pastikanAdmin()
--
-- TIDAK diubah (sengaja):
--   * "Staf bisa lihat semua jenis layanan" (SELECT) -> petugas tetap perlu
--     daftar jenis surat untuk "Buat Surat Langsung".
--   * surat_terbit (0020): Sekdes/Kaur/Kasi tetap boleh MENERBITKAN surat lewat
--     Pengajuan Layanan; yang dikunci hanya menu/arsip Surat Terbit di sidebar.
--   * Policy publik (berita terbit, wisata aktif, APBDes terbit, galeri).
--   * Storage bucket desa-media (masih boleh_tulis_staf, lihat 0017) -- tinjau
--     terpisah kalau upload ingin dibatasi admin juga.
--
-- ROLLBACK: ganti public.adalah_admin() di bawah dengan public.akses_tulis_penuh().

begin;

-- Jenis layanan (form builder)
drop policy if exists "Staf bisa tulis jenis layanan" on public.jenis_layanan_master;
create policy "Staf bisa tulis jenis layanan"
  on public.jenis_layanan_master for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Galeri kegiatan
drop policy if exists "Staf bisa kelola galeri kegiatan" on public.galeri_kegiatan;
create policy "Staf bisa kelola galeri kegiatan"
  on public.galeri_kegiatan for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Wisata desa
drop policy if exists "Kantor desa kelola wisata" on public.wisata;
create policy "Kantor desa kelola wisata"
  on public.wisata for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Berita desa
drop policy if exists "Kantor desa kelola berita" on public.berita;
create policy "Kantor desa kelola berita"
  on public.berita for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- APBDes (tahun + rincian)
drop policy if exists "Kantor desa kelola tahun APBDes" on public.apbdes_tahun;
create policy "Kantor desa kelola tahun APBDes"
  on public.apbdes_tahun for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

drop policy if exists "Kantor desa kelola rincian APBDes" on public.apbdes_item;
create policy "Kantor desa kelola rincian APBDes"
  on public.apbdes_item for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

commit;
