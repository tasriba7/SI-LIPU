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
