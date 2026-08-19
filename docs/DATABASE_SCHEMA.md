> ⚠️ **Dokumen ini adalah RENCANA/tujuan akhir, bukan cerminan kode yang sudah jalan.**
> Untuk status implementasi sebenarnya & penyimpangan yang sudah terjadi, baca dulu
> bagian **PENYIMPANGAN DARI RENCANA** di `AI_HANDOFF.md`.

# DATABASE_SCHEMA.md — Skema Database Inti

> Tabel-tabel ini adalah MASTER DATA. Semua modul (surat, keuangan, kependudukan, dan modul
> masa depan) WAJIB memakai tabel ini, bukan membuat versi sendiri-sendiri.

## 1. `warga` (master penduduk)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| nik | varchar(16) | unique |
| no_kk | varchar(16) | nomor KK |
| nama_lengkap | text | |
| tempat_lahir | text | |
| tanggal_lahir | date | |
| jenis_kelamin | enum | L/P |
| alamat | text | |
| rt | varchar(5) | |
| rw | varchar(5) | |
| dusun | text | |
| status_kawin | enum | |
| pekerjaan | text | |
| agama | text | |
| status_dalam_kk | text | Kepala Keluarga/Anggota |
| created_at | timestamp | |
| updated_at | timestamp | |

## 2. `perangkat_desa` (master pengguna sistem/staf)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key, terhubung ke Supabase Auth user id |
| nama_lengkap | text | |
| jabatan | text | Kades, Sekdes, Kaur, Kadus, dst |
| role_id | uuid | foreign key ke `role` |
| nomor_hp | text | |
| status_aktif | boolean | |

## 3. `role`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| nama_role | text | Kepala Desa, Sekretaris, Kaur, Kadus, Ketua RT, dst |
| hak_akses | jsonb | daftar permission per modul, misal `{"surat": ["read","write","approve"]}` |
| butuh_wilayah | boolean | true untuk role yang punya banyak slot per wilayah (Kadus, Ketua RT); false untuk role tunggal se-desa (Kades, Sekdes) |
| pendaftaran_terbuka | boolean | true = orangnya boleh daftar sendiri (misal Ketua RT); false = HANYA admin yang bisa buat akun (Kades, Sekdes, Kaur) |

## 3a. `posisi_perangkat` (slot jabatan spesifik, WAJIB untuk role dengan `butuh_wilayah = true`)
> Ini yang mencegah duplikasi: satu slot = satu wilayah + satu role. "Ketua RT" di RT 01/RW 02
> adalah slot berbeda dari "Ketua RT" di RT 02/RW 02, jadi keduanya bisa terisi bersamaan.
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| role_id | uuid | FK ke `role` |
| wilayah | text | contoh: "RT 01/RW 02", "Dusun Pantai" — null jika role tidak butuh wilayah |
| status | enum | kosong / terisi |
| perangkat_desa_id | uuid | FK ke `perangkat_desa`, null jika status kosong |
| diisi_pada | timestamp | |
| dikosongkan_oleh | uuid | FK ke `perangkat_desa` (admin), diisi saat admin reset slot |
| dikosongkan_pada | timestamp | |

## 3b. `pendaftaran_akun` (khusus role dengan `pendaftaran_terbuka = true`, misal Ketua RT)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| posisi_id | uuid | FK ke `posisi_perangkat` — slot spesifik yang didaftar |
| nama_lengkap | text | |
| nik | varchar(16) | untuk verifikasi identitas pendaftar |
| nomor_hp | text | |
| status | enum | pending / disetujui / ditolak |
| catatan_admin | text | alasan jika ditolak |
| tanggal_daftar | timestamp | |
| diproses_oleh | uuid | FK ke `perangkat_desa` (admin yang approve/reject) |
| tanggal_diproses | timestamp | |

> **Aturan wajib:** saat submit pendaftaran, sistem WAJIB cek `posisi_perangkat.status` dulu.
> Jika `terisi` → tolak otomatis saat itu juga (tidak masuk `pendaftaran_akun` sama sekali),
> tampilkan pesan: "Slot [Role] [Wilayah] sudah terisi, hubungi admin desa." Jika `kosong` →
> boleh lanjut submit, masuk status `pending` menunggu admin.

## 4. `surat` (modul surat-menyurat)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| nomor_surat | text | auto-generate |
| jenis_surat | text | SKTM, Domisili, Usaha, dst |
| warga_id | uuid | FK ke `warga` |
| diajukan_oleh | uuid | FK ke `perangkat_desa` (jika input oleh operator) |
| status | enum | diajukan / diproses / disetujui / ditolak / selesai |
| disetujui_oleh | uuid | FK ke `perangkat_desa` |
| tanggal_pengajuan | timestamp | |
| tanggal_selesai | timestamp | |
| file_surat | text | link ke file PDF hasil |

## 5. `apbdes_anggaran` (modul keuangan)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| tahun_anggaran | int | |
| bidang | text | Penyelenggaraan Pemerintahan, Pembangunan, dst (sesuai Permendagri) |
| kegiatan | text | |
| jenis | enum | pendapatan / belanja / pembiayaan |
| anggaran | numeric | jumlah dianggarkan |
| realisasi | numeric | jumlah terpakai (running total) |

## 6. `apbdes_transaksi` (detail realisasi)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| anggaran_id | uuid | FK ke `apbdes_anggaran` |
| tanggal | date | |
| uraian | text | |
| jumlah | numeric | |
| bukti_file | text | link nota/kwitansi hasil scan |
| diinput_oleh | uuid | FK ke `perangkat_desa` |

## 7. `jenis_layanan_master` (daftar semua jenis layanan yang bisa diajukan warga)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| nama_layanan | text | "SKTM", "Pengaduan Jalan Rusak", "Bantuan Sosial", dst |
| kategori | text | surat / pengaduan / bansos / lainnya |
| icon | text | nama ikon untuk ditampilkan di menu "Ajukan Layanan" |
| form_schema | jsonb | daftar field tambahan (dinamis) yang harus diisi warga khusus jenis ini — dibuat lewat Form Builder di admin, lihat contoh struktur di bawah |
| aktif | boolean | tampil/tidak di menu warga |
| dibuat_oleh | uuid | FK ke `perangkat_desa`, admin yang membuat jenis layanan ini |
| created_at | timestamp | |

### Struktur `form_schema` (contoh isi JSON)
Field standar (NIK, Nama, Nomor HP) TIDAK perlu ditulis di sini — sudah otomatis ada di semua
jenis layanan lewat sistem inti. `form_schema` hanya berisi field TAMBAHAN yang spesifik untuk
jenis layanan tsb, disusun admin lewat Form Builder (bukan ditulis manual sebagai JSON — itu
representasi hasil di database saja).

```json
[
  {
    "field_key": "nama_usaha",
    "label": "Nama Usaha",
    "tipe": "teks_pendek",
    "wajib": true
  },
  {
    "field_key": "jenis_usaha",
    "label": "Jenis Usaha",
    "tipe": "pilihan",
    "wajib": true,
    "opsi": ["Kios/Toko", "Warung Makan", "Bengkel", "Lainnya"]
  },
  {
    "field_key": "foto_lokasi",
    "label": "Foto Lokasi Usaha",
    "tipe": "upload_file",
    "wajib": false
  }
]
```

**Tipe field yang didukung:** `teks_pendek`, `teks_panjang`, `angka`, `tanggal`, `pilihan`
(dropdown, butuh `opsi`), `upload_file`.

## 8. `pengajuan_layanan` (SATU tabel generik untuk SEMUA jenis pengajuan warga)
> Ini jantung dari menu "Ajukan Layanan" 1-klik. Semua jenis layanan (surat, pengaduan, bansos,
> dan jenis baru di masa depan) masuk ke tabel ini — bukan bikin tabel terpisah per jenis.
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| kode_pengajuan | text | unik, format `PL-YYYYMMDD-####`, dipakai warga untuk cek status tanpa login |
| jenis_layanan_id | uuid | FK ke `jenis_layanan_master` |
| nik | varchar(16) | diisi manual oleh warga tiap pengajuan (tanpa login) |
| tanggal_lahir_input | date | diisi manual, dipakai bersama NIK sebagai kunci verifikasi (lihat `SECURITY.md`) |
| warga_id | uuid | FK ke `warga`, diisi OTOMATIS oleh sistem jika NIK + Tanggal Lahir cocok |
| nama_pemohon | text | fallback kalau NIK belum ada di `warga` (warga baru/belum terdata) |
| nomor_hp | text | dipakai juga untuk verifikasi saat cek status |
| data_tambahan | jsonb | isian sesuai `form_schema` dari jenis layanan terkait |
| status | enum | diajukan / diproses / disetujui / ditolak / selesai |
| catatan_petugas | text | |
| diproses_oleh | uuid | FK ke `perangkat_desa` |
| tanggal_pengajuan | timestamp | |
| tanggal_update | timestamp | |

> Catatan: tabel `surat` (poin 4) tetap ada untuk data surat yang sudah jadi/final (nomor surat
> resmi, file PDF). `pengajuan_layanan` adalah tahap "permintaan masuk" sebelum diproses jadi
> surat resmi atau tindak lanjut lain. Alur: warga ajukan lewat `pengajuan_layanan` →
> disetujui → sistem generate record di `surat` (jika jenisnya surat) atau tindak lanjut lain
> (jika pengaduan/bansos).

## 9. `log_aktivitas` (dipakai semua modul)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | FK ke `perangkat_desa` |
| modul | text | surat/keuangan/kependudukan/dst |
| aksi | text | "membuat surat baru", "update anggaran", dst |
| waktu | timestamp | |

---

## Aturan Perluasan Tabel
- Modul baru butuh tabel baru? **Boleh**, tapi harus tetap referensi ke `warga` dan
  `perangkat_desa` lewat foreign key — jangan duplikasi data warga/staf.
- Tambah kolom ke tabel yang sudah ada **boleh**, tapi jangan hapus/ubah tipe kolom yang sudah
  dipakai modul lain tanpa cek dampaknya dulu.
