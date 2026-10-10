> ⚠️ **Dokumen ini adalah RENCANA/tujuan akhir, bukan cerminan kode yang sudah jalan.**
> Untuk status implementasi sebenarnya & penyimpangan yang sudah terjadi, baca dulu
> bagian **PENYIMPANGAN DARI RENCANA** di `AI_HANDOFF.md`.

# SECURITY.md — Aturan Keamanan Data (WAJIB DIPATUHI)

Dokumen ini mengatur bagaimana data warga (terutama NIK, nama, alamat) harus dilindungi,
khususnya di fitur-fitur yang bisa diakses TANPA login (mis. "Ajukan Layanan").

---

## 1. Aturan Lookup Data Warga (paling kritis)

Fitur auto-isi data dari form "Ajukan Layanan" WAJIB mengikuti aturan ini:

1. **Kunci pencarian WAJIB dua faktor: NIK + Tanggal Lahir**, bukan NIK saja. NIK relatif mudah
   ditemukan di berbagai dokumen/kop surat, jadi tidak cukup jadi satu-satunya kunci. Kombinasi
   NIK + Tanggal Lahir jauh lebih sulit ditebak sembarang orang.

2. **DILARANG membuat autocomplete/typeahead** terhadap NIK, tanggal lahir, atau nama warga.
   Pencarian hanya boleh dipicu setelah **kedua field terisi lengkap** (NIK 16 digit format
   valid + tanggal lahir valid) DAN warga menekan tombol cari secara eksplisit — bukan otomatis
   saat mengetik.

3. **Kedua field harus cocok BERSAMAAN.** Jika hanya salah satu yang cocok (misal NIK benar tapi
   tanggal lahir salah, atau sebaliknya), sistem tetap merespons "tidak ditemukan" — SAMA PERSIS
   seperti respons saat keduanya salah. Jangan pernah beri sinyal field mana yang benar/salah,
   karena itu membuka celah menebak satu field dulu baru field lainnya.

4. **DILARANG mengembalikan data mentah langsung ke frontend.** Alur wajib:
   - Backend cocokkan NIK + Tanggal Lahir → jika keduanya cocok, kembalikan versi **masking**
     (nama & alamat disamarkan sebagian, contoh: `Ta**** A. A****`, `Dusun B****`)
   - Tampilkan ke warga untuk konfirmasi: **"Apakah ini Anda?"**
   - Data LENGKAP baru dikirim ke frontend setelah warga eksplisit konfirmasi "Ya"

5. **DILARANG membocorkan info saat pencarian gagal.** Pesan error harus generik,
   contoh: "Data tidak ditemukan, silakan isi manual" — JANGAN pernah beri petunjuk seperti
   "NIK ditemukan tapi tanggal lahir tidak cocok" atau semacamnya.

6. **Field sensitif TIDAK PERNAH ikut di-return** oleh fitur lookup ini, meskipun ada di
   tabel `warga`. Field yang BOLEH dipakai untuk auto-fill hanya: nama, alamat dasar (dusun/RT/
   RW). Field seperti agama, status kawin, pekerjaan **dilarang** ikut ter-fetch di endpoint ini.

## 2. Rate Limiting & Anti-Scraping

- Maksimal **5 percobaan pencarian gagal per 15 menit** dari IP/perangkat/sesi yang sama.
  Setelah melewati batas, blokir sementara (misal 30 menit) + tampilkan CAPTCHA sebelum bisa
  mencoba lagi.
- Endpoint lookup harus punya rate limit di level backend (bukan hanya di frontend, karena
  frontend bisa dilewati/dimanipulasi).
- Jangan pernah expose endpoint yang bisa dipakai untuk "list semua warga" tanpa autentikasi
  admin. Endpoint publik hanya boleh terima 1 pasang NIK+Tanggal Lahir spesifik per request,
  bukan query/filter bebas.

## 3. Audit & Logging

- Setiap percobaan pencarian (berhasil maupun gagal) dicatat ke tabel log tersendiri:
  `log_pencarian_warga` (kolom: nik_dicoba, tanggal_lahir_dicoba, berhasil boolean,
  ip/device_hash, waktu). JANGAN gabungkan dengan `log_aktivitas` staf, karena ini datang dari
  publik/anonim.
- Admin sebaiknya bisa lihat ringkasan: NIK apa saja yang paling sering dicoba, dan pola
  mencurigakan (mis. banyak NIK berurutan dicoba dalam waktu singkat) — fitur ini boleh
  menyusul di fase lanjut, tapi struktur logging-nya harus ada sejak awal.

## 4. Prinsip Umum Perlindungan Data Warga

- Semua endpoint yang mengakses tabel `warga` di luar konteks login admin HARUS melalui
  lapisan validasi ketat (format NIK, rate limit, masking) — tidak ada akses langsung ke
  database dari sisi client (frontend) dalam bentuk apapun.
- Supabase Row Level Security (RLS) WAJIB diaktifkan di tabel `warga` sejak awal. Akses publik
  (anon key) hanya boleh lewat function/endpoint khusus yang menerapkan aturan di atas — bukan
  query langsung ke tabel.
- Data yang di-generate untuk warga (kode pengajuan, dsb) tidak boleh berisi NIK secara
  langsung/mudah ditebak (gunakan kode acak, bukan turunan dari NIK).

## 5. Untuk AI/Developer Penerus

Jika mengerjakan fitur apapun yang menyentuh tabel `warga` tanpa login admin, **wajib baca
dokumen ini dulu** dan pastikan implementasinya sesuai. Jika ragu, jangan menebak — tanyakan ke
pemilik proyek sebelum melanjutkan, karena kebocoran data kependudukan adalah risiko serius
(hukum & kepercayaan warga terhadap desa).


---

## Pengaduan Anonim (WAJIB DIPATUHI)
- Jika pelapor memilih anonim, identitas (nama, NIK, No. HP, `warga_id`) **tidak boleh disimpan
  sama sekali** — bukan sekadar disembunyikan di tampilan. Jangan pernah menambah fitur yang
  menyimpan identitas pelapor anonim (log IP, nomor HP "cadangan", dsb).
- Jangan mengubah `anonim` jadi `false` atau mengisi identitas belakangan; trigger
  `jaga_pengaduan_anonim` di database memblokirnya.
- Kode tracking adalah satu-satunya kunci pelapor anonim: dibuat dengan `crypto`, minimal 10 karakter.
- Form pengaduan **wajib verifikasi NIK + tanggal lahir lebih dulu** (anonim maupun tidak). Server
  menerbitkan bukti verifikasi bertanda tangan (`lib/buktiVerifikasi.js`, kedaluwarsa 30 menit,
  TANPA identitas di dalamnya) dan `ajukanLayanan` menolak pengaduan tanpa bukti itu. Jangan
  memasukkan NIK/warga_id ke dalam bukti, karena akan merusak anonimitas.
- Catatan: pencarian NIK tetap tercatat di `log_pencarian_warga` (NIK, IP, waktu) sesuai aturan
  audit di atas; log ini tidak ditautkan ke baris pengaduan.


---

## Tautan Bagikan Data ke Instansi (WAJIB DIPATUHI)
- Hanya role `admin` yang boleh membuat/membatalkan tautan (dicek di server action + RLS `adalah_admin()`).
- Token = 256-bit acak (`crypto.randomBytes`), tidak turunan dari data apa pun. Di database hanya
  disimpan **hash SHA-256**-nya; tautan asli hanya tampil sekali ke admin saat dibuat.
- **Sekali pakai, atomik**: hangus lewat satu perintah `UPDATE ... WHERE status='aktif' AND kedaluwarsa_pada > now()`.
  Jangan diganti dengan "baca dulu lalu tulis" (celah balapan dua pembuka).
- Halaman `/data-bersama/[token]` (GET) **hanya membaca**, tidak boleh menghanguskan tautan atau memuat data
  pribadi. Data baru dikirim setelah penerima menekan tombol konfirmasi di halaman peringatan.
  Jangan memindahkan data ke render halaman awal (pratinjau tautan/crawler akan memakai jatah satu kali).
- Data diambil dari tabel sumber saat dibuka (tidak disalin ke `tautan_data`), hanya isi yang dicentang.
- Unduhan dibuat di browser dari data yang sudah termuat. Jangan menambah endpoint unduhan terpisah yang
  bisa dipanggil setelah tautan hangus.
- Halaman diberi `noindex`, `no-referrer`, dan `force-dynamic`. Riwayat (`tautan_data`) tidak punya policy
  delete = jejak audit siapa membagikan apa ke siapa dan kapan dibuka.


---

## Daftar Penerima Bantuan Desa (PENGECUALIAN YANG DISETUJUI PEMILIK)
Halaman publik `/layanan/bantuan` ("Cek Bantuan" di Panel Warga) menampilkan **nama lengkap** penerima
bantuan tanpa login. Ini pengecualian sadar terhadap aturan "jangan list warga ke publik" di atas,
diputuskan oleh pemilik proyek (transparansi bantuan desa). Batasannya WAJIB dijaga:
- Hanya baris `penerima_bantuan.tampil_publik = true` yang keluar; bawaan baris baru = **disembunyikan**.
  Hanya role `admin` yang boleh mengubahnya (server action `pastikanAdmin` + RLS `adalah_admin()`).
- Yang dikembalikan HANYA nama, dusun/RT/RW, nama bantuan, dan periode. **Jangan pernah** menambah NIK,
  tanggal lahir, No. HP, atau kolom lain ke fungsi `bantuan_publik_daftar` / `bantuan_publik_ringkasan`.
- Kedua fungsi itu hanya bisa dipanggil `service_role` (dari server Next.js lewat `lib/bantuanPublik.js`),
  tidak dari browser/anon key. Jangan memberi `grant execute` ke `anon`/`authenticated`.
- Maksimal 50 baris per permintaan (dikunci di fungsi database), 20 per halaman di tampilan. Pencarian
  nama dipicu tombol (bukan typeahead), minimal 3 huruf. Jangan menambah fitur unduh/ekspor massal publik.
- Warga berstatus meninggal/pindah otomatis tidak ikut tampil. Halaman diberi `noindex`.
- Kalau kebijakan desa berubah ingin lebih ketat (nama disamarkan atau cek pribadi NIK + tanggal lahir),
  ubah di `lib/bantuanPublik.js` dan halaman tersebut; gunakan `lib/masking.js` / `lib/lookupWarga.js`.


---

## 6. Pengecualian yang tercatat: "Data Saya" (migrasi 0038)

Atas permintaan pemilik proyek, halaman publik `/layanan/data-saya` menampilkan **data lengkap milik
warga itu sendiri** (termasuk agama, status kawin, pekerjaan, pendidikan, No. KK, No. HP) setelah
NIK + Tanggal Lahir cocok, **tanpa** langkah "Apakah ini Anda?" dan **tanpa** masking. Ini menyimpang
dari poin 1.4 dan 1.6 di atas. Pengamanan lain TETAP berlaku dan tidak boleh dilonggarkan:

- dua faktor harus cocok bersamaan; respons "tidak ditemukan" sama untuk semua kegagalan;
- rate limit 5 gagal / 15 menit di server (`hitung_percobaan_gagal`, gagal-tertutup);
- setiap percobaan dicatat di `log_pencarian_warga`;
- hanya penduduk berstatus `aktif`; hanya DIRI SENDIRI (tidak ada data anggota keluarga lain);
- fungsi `data_warga_publik` dan `kirim_laporan_data_warga` hanya bisa dijalankan `service_role`;
- form laporan memeriksa ULANG dua faktor di database (tidak bisa melapor atas nama orang lain),
  maksimal 3 laporan berstatus "baru" per penduduk (anti-spam).

Risiko yang diterima: siapa pun yang mengetahui NIK + tanggal lahir seseorang bisa melihat data
lengkapnya. Kalau kelak dirasa terlalu longgar, langkah pengetatan yang paling murah: samarkan
NIK/No. KK/No. HP di `app/(publik)/layanan/data-saya/page.js`, atau tambahkan CAPTCHA.

## Faktor ketiga: tebak tempat lahir (migrasi 0042)

Setelah NIK + tanggal lahir cocok, warga harus memilih tempat lahirnya dari 6 pilihan
bertanda inisial (huruf ke-1, ke-5, ke-9, ... terlihat; contoh `Tatakalai` -> `T***K***I`).

- Berlaku di: Data Saya, Riwayat Ajuan, Ajukan Layanan, Pengaduan, dan Pendaftaran Akun.
- **Salah 3 kali -> pencarian dibatalkan** dan warga itu dikunci 24 jam (dihitung per warga
  di tabel `percobaan_tempat_lahir`, bukan di browser, jadi menyegarkan halaman tidak mereset).
  Satu IP juga dibatasi 10 tebakan salah per jam supaya tidak bisa menebak banyak warga.
- Pilihan bersifat deterministik per warga (pengecoh tidak berganti saat halaman dimuat ulang,
  supaya jawaban benar tidak bisa dikenali dari "pilihan yang selalu muncul").
- Daftar pilihan ikut ditandatangani server (tiket 10 menit, terikat NIK + warga_id), jawaban
  benar tidak pernah dikirim ke browser, dan tebakan dicatat SEBELUM dinilai (anti-paralel).
- Kalau `tempat_lahir` belum terisi di data warga, langkah ini dilewati (tidak bisa ditanyakan).
  Lengkapi kolom itu lewat dashboard kependudukan agar semua warga terlindungi.
- Batas dan jumlah pilihan diatur di `lib/verifikasiTempatLahir.js`
  (`BATAS_SALAH`, `JUMLAH_PILIHAN`).
