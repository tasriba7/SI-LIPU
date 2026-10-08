-- Fase 2 - Modul 4 (lanjutan): template Surat Kelahiran & Surat Kematian.
-- Jalankan SETELAH 0020. Aman dijalankan ulang.
--
-- Kedua surat ini menerangkan ORANG LAIN (bayi / almarhum), bukan pemohon, dan
-- punya DUA blok biodata dengan kalimat penghubung di antaranya, mis.:
--     Hari / Tanggal / Di
--     "Telah lahir seorang anak :"
--     Nama / Jenis kelamin / Nama ibu / Alamat / Nama ayah
-- Karena itu template_surat diberi 3 kolom opsional (nilai default = kosong,
-- jadi template lama tetap bekerja persis seperti sebelumnya):
--   judul_atas  : teks kecil miring di atas judul (mis. "UNTUK YANG BERSANGKUTAN")
--   teks_tengah : kalimat penghubung antara biodata pertama dan kedua
--   biodata2    : biodata kedua, [{ "label": "...", "value": "{{...}}" }]

alter table public.template_surat add column if not exists judul_atas text not null default '';
alter table public.template_surat add column if not exists teks_tengah text not null default '';
alter table public.template_surat add column if not exists biodata2 jsonb not null default '[]'::jsonb;

-- 1. Field Form Builder untuk kedua layanan ------------------------------------
-- Hanya diisi kalau admin BELUM pernah menyusun field-nya (form_schema masih
-- kosong), supaya pengaturan admin tidak tertimpa.
-- field_key di sini dipakai template sebagai {{field_key}}. Untuk field bertipe
-- tanggal, sistem otomatis menyediakan juga {{key_angka}} (22-09-1999) dan
-- {{key_hari}} (Rabu), jadi admin tidak perlu mengetik nama hari.
update public.jenis_layanan_master
set form_schema = '[
  {"field_key":"nama_anak","label":"Nama Anak","tipe":"teks_pendek","wajib":true},
  {"field_key":"jenis_kelamin_anak","label":"Jenis Kelamin Anak","tipe":"pilihan","wajib":true,"opsi":["Laki-laki","Perempuan"]},
  {"field_key":"tanggal_lahir_anak","label":"Tanggal Lahir Anak","tipe":"tanggal","wajib":true},
  {"field_key":"tempat_lahir_anak","label":"Tempat Lahir Anak (kota/kabupaten)","tipe":"teks_pendek","wajib":true},
  {"field_key":"nama_ibu","label":"Nama Ibu","tipe":"teks_pendek","wajib":true},
  {"field_key":"nama_ayah","label":"Nama Ayah","tipe":"teks_pendek","wajib":true},
  {"field_key":"alamat_anak","label":"Alamat Anak (kosongkan jika sama dengan alamat pemohon)","tipe":"teks_panjang","wajib":false}
]'::jsonb
where nama_layanan = 'Surat Keterangan Kelahiran'
  and (form_schema is null or form_schema = '[]'::jsonb);

update public.jenis_layanan_master
set form_schema = '[
  {"field_key":"nama_almarhum","label":"Nama Lengkap Almarhum/Almarhumah","tipe":"teks_pendek","wajib":true},
  {"field_key":"jenis_kelamin_almarhum","label":"Jenis Kelamin","tipe":"pilihan","wajib":true,"opsi":["Laki-laki","Perempuan"]},
  {"field_key":"tempat_lahir_almarhum","label":"Tempat Lahir","tipe":"teks_pendek","wajib":true},
  {"field_key":"tanggal_lahir_almarhum","label":"Tanggal Lahir","tipe":"tanggal","wajib":true},
  {"field_key":"agama_almarhum","label":"Agama","tipe":"pilihan","wajib":true,"opsi":["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu","Lainnya"]},
  {"field_key":"alamat_almarhum","label":"Alamat Terakhir (kosongkan jika sama dengan alamat pemohon)","tipe":"teks_panjang","wajib":false},
  {"field_key":"tanggal_meninggal","label":"Tanggal Meninggal","tipe":"tanggal","wajib":true},
  {"field_key":"pukul_meninggal","label":"Pukul Meninggal (mis. 03:00 WITA)","tipe":"teks_pendek","wajib":true},
  {"field_key":"penyebab_kematian","label":"Penyebab Kematian","tipe":"pilihan","wajib":true,"opsi":["Sakit","Usia lanjut","Kecelakaan","Lainnya"]}
]'::jsonb
where nama_layanan = 'Surat Keterangan Kematian'
  and (form_schema is null or form_schema = '[]'::jsonb);

-- 2. Template (redaksi mengacu pada contoh surat desa) ----------------------------
insert into public.template_surat
  (kode, nama, kata_kunci, judul_atas, judul, pembuka, biodata, teks_tengah, biodata2, isi, penutup)
values
('kelahiran', 'Surat Keterangan Kelahiran', array['kelahiran','lahir'],
 '',
 'SURAT KETERANGAN KELAHIRAN',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, menerangkan bahwa pada:',
 '[{"label":"Hari","value":"{{tanggal_lahir_anak_hari}}"},{"label":"Tanggal","value":"{{tanggal_lahir_anak_angka}}"},{"label":"Di","value":"{{tempat_lahir_anak}}"}]',
 'Telah lahir seorang anak:',
 '[{"label":"Nama","value":"{{nama_anak}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin_anak}}"},{"label":"Nama Ibu","value":"{{nama_ibu}}"},{"label":"Alamat","value":"{{alamat_anak}}"},{"label":"Nama Ayah","value":"{{nama_ayah}}"}]',
 '',
 'Surat keterangan ini dibuat atas dasar yang sebenarnya.'),

('kematian', 'Surat Keterangan Kematian', array['kematian','meninggal'],
 'UNTUK YANG BERSANGKUTAN',
 'SURAT KETERANGAN KEMATIAN',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, dengan ini menerangkan bahwa:',
 '[{"label":"Nama Lengkap","value":"{{nama_almarhum}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin_almarhum}}"},{"label":"Tempat/Tgl. Lahir","value":"{{tempat_lahir_almarhum}}, {{tanggal_lahir_almarhum_angka}}"},{"label":"Agama","value":"{{agama_almarhum}}"},{"label":"Alamat","value":"{{alamat_almarhum}}"}]',
 'Telah meninggal dunia pada:',
 '[{"label":"Hari","value":"{{tanggal_meninggal_hari}}"},{"label":"Tanggal","value":"{{tanggal_meninggal_angka}}"},{"label":"Pukul","value":"{{pukul_meninggal}}"},{"label":"Pada Usia","value":"{{usia_almarhum}}"},{"label":"Penyebab Kematian","value":"{{penyebab_kematian}}"}]',
 '',
 'Demikian surat keterangan ini kami buat, untuk dapat dipergunakan sebagaimana mestinya.')
on conflict (kode) do nothing;
