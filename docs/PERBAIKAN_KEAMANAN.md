# Perbaikan Keamanan (migrasi 0028 & 0029)

## Urutan pelaksanaan (WAJIB berurutan)

1. **Supabase Dashboard -> Authentication -> Sign In / Providers**: matikan
   *Allow new users to sign up*. (Akun staf tetap dibuat lewat aplikasi.)
2. Jalankan `supabase/migrations/0028_perketat_akses_aman.sql` di SQL Editor.
3. Timpa file kode dari paket ini, lalu **deploy**.
4. Uji manual (lihat di bawah).
5. Jalankan `supabase/migrations/0029_kunci_rpc_dan_akun_staf.sql`.
6. Jalankan `supabase/verifikasi_0028_0029.sql` untuk memastikan hasilnya.

## Uji manual sebelum 0029
- Buat akun staf baru di Kelola Akun Staf (login dengan akun itu).
- Setujui satu pendaftaran Kadus/Ketua RT.
- Form publik "Ajukan Layanan": cari NIK + tanggal lahir, kirim satu pengajuan.
- Pengaduan: verifikasi lalu kirim. Kirim ulang dengan verifikasi yang sama harus ditolak.
- Menu "Buat Surat Langsung" oleh staf.
- Halaman Riwayat Pengajuan (NIK + tanggal lahir).
- Form pendaftaran posisi (/pendaftaran).

## Apa yang berubah
| Masalah | Perbaikan |
|---|---|
| Role akun bisa diisi pendaftar lewat `user_metadata` | Trigger membaca `app_metadata` (hanya server). Kode pembuat akun diubah. |
| Rate limit NIK bisa dilewati lewat API Supabase langsung | RPC hanya `service_role`; pemanggil memakai client admin; gagal-tertutup. |
| Insert publik `with check (true)` | Ditutup; insert lewat server action (service role) dengan validasi penuh. |
| Bukti pengaduan bisa dipakai berulang | Sekali pakai (nonce di `bukti_verifikasi_terpakai`, tanpa identitas). |
| `warga_id`/NIK dari form dipercaya | `warga_id` hanya diterima dengan bukti server; nama diambil dari database. |
| `form_schema`, panjang input, prefix kode tidak divalidasi di publik | `lib/validasiPengajuan.js`; prefix dari database. |
| Data pengajuan/log terbaca akun login mana pun | Policy `adalah_staf()`; log hanya admin. |
| Kepala Desa bisa mengubah `pengajuan_layanan` | Policy update `boleh_tulis_staf()` (sesuai 0017). |
| Ekspor: `cari` mentah ke `.or()` | Disanitasi. |
| Password acak ~44 bit, minimal 6 | `crypto.randomInt`, 12 karakter ~70 bit, minimal manual 8. |

## Akun dibuat lewat Dashboard Supabase
Setelah 0029, "Add user" di dashboard Supabase tidak otomatis membuat profil staf.
Gunakan Kelola Akun Staf, atau tambahkan profil manual (contoh ada di 0029).

## Belum dikerjakan
- CAPTCHA / rate limit untuk pengiriman form publik (aktifkan Vercel Firewall
  atau Cloudflare Turnstile).
- Ganti `xlsx` ke build resmi SheetJS (npm punya versi lama yang rentan):
  `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- Anonimitas pengaduan masih bisa dikorelasikan lewat waktu antara
  `log_pencarian_warga` dan `created_at` aduan (di desa kecil).
- Sinkronkan seluruh migrasi di repo dengan database (ditemukan selisih: trigger
  slot dan policy update sudah berbeda dari file migrasi).
