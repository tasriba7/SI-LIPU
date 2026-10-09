-- Perapian nama dusun (JALANKAN MANUAL di Supabase SQL Editor, bukan migrasi).
-- Aman dijalankan ulang. Tidak mengubah data warga.
--
-- Latar belakang: daftar dusun sekarang diambil dari slot Kepala Dusun, dan
-- isian Dusun di data warga memilih dari daftar itu. Nilai lama seperti
-- "Kepala Dusun 01" tidak akan pernah cocok dengan isian "Dusun 1".

-- 1) PRATINJAU: slot & akun Kadus yang namanya masih memakai nama jabatan.
select 'slot' as jenis, id::text as id, wilayah as nilai_sekarang,
       'Dusun ' || coalesce(nullif(ltrim(regexp_replace(wilayah, '^\s*(kepala\s+dusun|kadus|dusun)\s*[.:\-]?\s*', '', 'i'), '0'), ''), '0') as nilai_baru
from public.posisi_perangkat
where role = 'kadus' and wilayah !~* '^\s*dusun\s+\S+$'
union all
select 'profil', id::text, dusun,
       'Dusun ' || coalesce(nullif(ltrim(regexp_replace(dusun, '^\s*(kepala\s+dusun|kadus|dusun)\s*[.:\-]?\s*', '', 'i'), '0'), ''), '0')
from public.profiles
where role = 'kadus' and dusun !~* '^\s*dusun\s+\S+$';

-- 2) PERBAIKI (hapus tanda komentar bila pratinjau di atas sudah benar):
-- update public.posisi_perangkat
--   set wilayah = 'Dusun ' || coalesce(nullif(ltrim(regexp_replace(wilayah, '^\s*(kepala\s+dusun|kadus|dusun)\s*[.:\-]?\s*', '', 'i'), '0'), ''), '0')
-- where role = 'kadus' and wilayah !~* '^\s*dusun\s+\S+$';
--
-- update public.profiles
--   set dusun = 'Dusun ' || coalesce(nullif(ltrim(regexp_replace(dusun, '^\s*(kepala\s+dusun|kadus|dusun)\s*[.:\-]?\s*', '', 'i'), '0'), ''), '0')
-- where role = 'kadus' and dusun !~* '^\s*dusun\s+\S+$';

-- 3) CEK DATA WARGA: nilai Dusun yang tidak cocok dengan daftar dusun (slot Kadus).
--    Hanya menampilkan, tidak mengubah. Putuskan sendiri: samakan ejaannya
--    lewat menu Edit Data Warga atau tambahkan dusunnya di menu Posisi.
select coalesce(nullif(btrim(w.dusun), ''), '(kosong)') as dusun_di_data_warga,
       count(*) as jumlah_warga
from public.warga w
where not exists (
  select 1 from public.posisi_perangkat s
  where s.role = 'kadus' and public.norm_wil(s.wilayah) = public.norm_wil(w.dusun)
)
group by 1
order by 2 desc;
