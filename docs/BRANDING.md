> ⚠️ **Dokumen ini adalah RENCANA/tujuan akhir, bukan cerminan kode yang sudah jalan.**
> Untuk status implementasi sebenarnya & penyimpangan yang sudah terjadi, baca dulu
> bagian **PENYIMPANGAN DARI RENCANA** di `AI_HANDOFF.md`.

# BRANDING.md — Identitas & Aturan Penggunaan Nama

## Identitas Resmi
- **Nama aplikasi:** SI-LIPU
- **Kepanjangan:** Sistem Informasi Layanan Interaktif Pelayanan Umum
- **Asal kata "Lipu":** dari "Lipu Babasal"/"Lipu Tumbe" — nama kuno Kabupaten Banggai
  Kepulauan yang berarti "Negeri Pertama/Tempat Permulaan". Dipilih karena bermakna kuat
  secara budaya lokal Bangkep, namun netral secara wilayah (tidak merujuk nama pulau/kabupaten
  secara literal, sehingga tidak menimbulkan kesan aplikasi ini "milik" satu wilayah geografis
  tertentu).
- **Pencetus & pemilik proyek:** Tasrib A. Abbas, S.AP.
- **Instance/pengguna pertama:** Pemerintah Desa Tatakalai, Kec. —, Kab. Banggai Kepulauan

## Prinsip: Satu Kode, Banyak Instance (Bukan Satu Sistem Bersama)
Supaya nama "SI-LIPU" bisa dipakai desa lain TANPA data desa-desa itu tercampur atau tanpa
kehilangan jejak siapa originator sistem ini:

1. **Nama desa TIDAK BOLEH di-hardcode** di dalam kode program. Selalu ambil dari environment
   variable / tabel konfigurasi (`config_desa`), contoh:
   ```
   NEXT_PUBLIC_NAMA_DESA=Tatakalai
   NEXT_PUBLIC_KECAMATAN=...
   NEXT_PUBLIC_KABUPATEN=Banggai Kepulauan
   ```
2. **Setiap desa yang memakai sistem ini WAJIB punya database sendiri** (instance Supabase
   terpisah), bukan berbagi satu database dengan desa lain. Ini juga otomatis melindungi
   privasi data warga antar desa.
3. **Tampilan wajib menyertakan identitas instance**, bukan hanya logo "SI-LIPU" polos:
   ```
   SI-LIPU
   Sistem Informasi Layanan Interaktif Pelayanan Umum
   Desa Tatakalai — Kab. Banggai Kepulauan
   ```
4. **Kredit asal proyek wajib tetap ada** di halaman "Tentang" aplikasi (footer atau menu info),
   berbunyi kira-kira:
   > SI-LIPU dikembangkan pertama kali untuk Desa Tatakalai, Kab. Banggai Kepulauan,
   > digagas oleh Tasrib A. Abbas, S.AP.

   Baris ini **tidak boleh dihapus** oleh siapapun yang mereplikasi sistem ini ke desa lain,
   kecuali ada izin tertulis dari pemilik proyek.

## Yang Boleh & Tidak Boleh Dilakukan AI/Developer Penerus

**Boleh:**
- Menyalin kode ini untuk instance desa lain (dengan mengganti konfigurasi, bukan hardcode)
- Menambah fitur/modul baru selama tidak melanggar aturan di `AI_HANDOFF.md`

**Tidak boleh:**
- Menghapus atau mengubah kredit originator ("dikembangkan pertama kali untuk Desa Tatakalai...")
- Mengklaim nama "SI-LIPU" sebagai buatan pihak lain
- Menggabungkan database antar-desa tanpa persetujuan eksplisit tiap-tiap desa

## Lisensi
Status: **belum ditentukan secara formal** — sampai pemilik proyek (Tasrib A. Abbas, S.AP.)
menetapkan lisensi resmi (misal MIT dengan syarat atribusi, atau proprietary/tertutup),
anggap kode ini **hak cipta milik penuh Tasrib A. Abbas, S.AP.**, dan tidak boleh
didistribusikan ulang secara bebas oleh pihak lain tanpa izin.

> Catatan untuk AI penerus: jika pemilik proyek suatu saat meminta dibuatkan file `LICENSE`
> formal, tanyakan dulu jenis lisensi yang diinginkan (MIT, Apache 2.0, proprietary, dll)
> sebelum menuliskannya — jangan menebak.
