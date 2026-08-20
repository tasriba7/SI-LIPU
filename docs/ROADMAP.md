> ⚠️ **Dokumen ini adalah RENCANA/tujuan akhir, bukan cerminan kode yang sudah jalan.**
> Untuk status implementasi sebenarnya & penyimpangan yang sudah terjadi, baca dulu
> bagian **PENYIMPANGAN DARI RENCANA** di `AI_HANDOFF.md`.

# ROADMAP.md — Rencana Pengembangan Bertahap

Centang `[x]` setiap tahap selesai. Kerjakan berurutan dari atas — jangan loncat fase
kecuali diminta pemilik proyek.

## FASE 0 — Fondasi (harus selesai duluan, sebelum modul apapun)
- [ ] Setup project Next.js baru
- [ ] Setup project Supabase (database + auth)
- [ ] Buat tabel: `warga`, `perangkat_desa`, `role`, `posisi_perangkat`, `pendaftaran_akun`,
      `log_aktivitas`
- [ ] Sistem login (Supabase Auth) + role-based access
- [ ] Admin isi data awal `posisi_perangkat` (daftar semua RT/RW/Dusun di desa sebagai slot
      kosong, sebelum pendaftaran Ketua RT dibuka)
- [ ] Alur "Kelola Perangkat" untuk admin buat akun Kades/Sekdes/Kaur langsung
- [ ] Alur pendaftaran mandiri untuk Ketua RT/Kadus + approval admin (lihat `ARCHITECTURE.md`)
- [ ] Layout dasar: sidebar, header, navigasi (dipakai semua modul)
- [ ] Deploy pertama ke Vercel (halaman login saja dulu, pastikan pipeline jalan)

## FASE 1 — Modul Kependudukan
> Dikerjakan duluan karena jadi master data modul lain
- [ ] Form tambah/edit data warga (sederhana, minim kolom wajib di awal)
- [ ] Daftar warga + pencarian by NIK/nama
- [ ] Import data warga dari Excel (untuk data awal yang sudah ada di desa)
- [ ] Validasi NIK/KK duplikat

## FASE 1.5 — Menu "Ajukan Layanan" (fondasi, dikerjakan sejak awal, bukan nanti)
> Ini wajah utama aplikasi untuk warga — harus ada sejak modul pertama diluncurkan, bukan
> ditambah belakangan. Lihat detail alur di `ARCHITECTURE.md`.
- [ ] Tabel `jenis_layanan_master` + isi data awal (minimal 3-5 jenis surat + 1 pengaduan)
- [ ] Tabel `pengajuan_layanan` (skema generik, lihat `DATABASE_SCHEMA.md`)
- [ ] **Panel admin "Kelola Jenis Layanan" (Form Builder)** — admin bisa tambah jenis layanan
      baru + tentukan field wajib/opsional sendiri, tanpa perlu developer
- [ ] Halaman beranda warga dengan tombol besar "Ajukan Layanan"
- [ ] Form dinamis: pilih jenis → auto-lookup NIK → render field sesuai `form_schema` (termasuk
      validasi wajib/opsional) → submit
- [ ] Generate & tampilkan kode pengajuan setelah submit
- [ ] Halaman "Cek Status Pengajuan" (by kode atau NIK+HP)
- [ ] Inbox admin: daftar semua pengajuan masuk, filter per jenis/status, approval

## FASE 2 — Modul Surat Menyurat
- [ ] Daftar jenis surat yang bisa diajukan (mulai dari 3-5 jenis paling umum)
- [ ] Form pengajuan surat (pilih warga dari data kependudukan, bukan input ulang)
- [ ] Alur approval (operator → sekdes/kades)
- [ ] Generate PDF surat otomatis dari template
- [ ] Riwayat/status surat per warga

## FASE 3 — Modul Keuangan (APBDes)
- [ ] Input rencana anggaran per bidang/kegiatan
- [ ] Input realisasi/transaksi harian
- [ ] Dashboard ringkas: anggaran vs realisasi (grafik sederhana)
- [ ] Cetak laporan periodik (bulanan/tahunan)

## FASE 4 — Penghalusan & Kemudahan Pakai
- [ ] Uji coba dengan operator desa asli (bukan developer) — catat semua kebingungan mereka
- [ ] Sederhanakan alur/istilah berdasarkan hasil uji coba
- [ ] Tambahkan tooltip/bantuan kontekstual di form-form rumit
- [ ] Notifikasi WA/email untuk status surat & approval

## FASE 5 — Modul Lanjutan (sesuai prioritas nanti)
- [ ] BUMDes
- [ ] Bantuan sosial
- [ ] Musrenbang
- [x] Profil desa publik (website depan) — **sebagian**: identitas dasar (nama, wilayah
      administratif, alamat, foto latar beranda) sudah jalan lewat
      `/dashboard/pengaturan-desa` + tabel `config_desa` (dikerjakan lebih awal dari jadwal
      karena jadi identitas visual utama beranda, lihat `AI_HANDOFF.md`). Konten profil desa
      yang lebih lengkap (sejarah, visi-misi, struktur organisasi, dll) belum dikerjakan.
- (daftar ini akan berkembang — tambahkan sesuai kebutuhan desa)

---

## Catatan Penting
- Jangan mulai Fase 2/3 sebelum Fase 0 & 1 benar-benar stabil — modul lain bergantung ke situ.
- Setiap akhir fase, update bagian "STATUS TERKINI" di `AI_HANDOFF.md`.
