-- Jenis pengaduan: warga memilih kategori pengaduan (dropdown) sebelum menulis
-- isi pengaduan. Jalankan SETELAH 0018.
--
-- Isi pengaduan tetap disimpan di kolom `keterangan` (sudah ada).
-- Kolom baru ini menyimpan jenisnya, mis. "Jalan / jembatan rusak" atau
-- "Lainnya: pohon tumbang di jalan dusun" (kalau warga memilih "Lainnya").
-- Null untuk layanan non-pengaduan.
alter table public.pengajuan_layanan
  add column if not exists jenis_pengaduan text;
