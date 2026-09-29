-- 0016: Statistik penduduk PER DUSUN untuk beranda publik.
-- Jalankan SETELAH 0001-0015 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent).
--
-- CATATAN KEAMANAN (lihat docs/SECURITY.md): sama seperti statistik_beranda_detail()
-- di 0009, function ini HANYA mengembalikan angka agregat per dusun
-- (jumlah total, laki-laki, perempuan). TIDAK ADA nama, NIK, alamat, atau data
-- individu lain yang ikut keluar, jadi aman dipanggil publik tanpa login.
--
-- Beranda tetap jalan normal walau migrasi ini belum dijalankan: tab
-- "Per Dusun" hanya akan disembunyikan otomatis.

create or replace function public.statistik_beranda_dusun()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', label,
        'jumlah', jumlah,
        'laki', laki,
        'perempuan', perempuan
      )
      order by urutan, label
    ),
    '[]'::jsonb
  )
  from (
    select
      coalesce(
        nullif(initcap(regexp_replace(trim(dusun), '\s+', ' ', 'g')), ''),
        'Belum Diisi'
      ) as label,
      case when nullif(trim(dusun), '') is null then 1 else 0 end as urutan,
      count(*) as jumlah,
      count(*) filter (where jenis_kelamin = 'L') as laki,
      count(*) filter (where jenis_kelamin = 'P') as perempuan
    from public.warga
    group by 1, 2
  ) t;
$$;

grant execute on function public.statistik_beranda_dusun() to anon, authenticated;
