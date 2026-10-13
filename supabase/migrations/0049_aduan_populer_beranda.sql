-- 0049: "Aduan yang Sering Disampaikan Warga" di beranda publik.
-- Jalankan SETELAH 0048. Idempotent — aman dijalankan ulang.
--
-- PRIVASI: fungsi ini HANYA mengembalikan jenis pengaduan + jumlahnya
-- (agregat). Tidak ada nama, NIK, No. HP, kode tracking, isi pengaduan, atau
-- tanggal per laporan yang keluar -- jadi aman dibaca publik, termasuk untuk
-- pengaduan anonim.
--   * Jawaban "Lainnya: <teks bebas warga>" digabung menjadi satu kategori
--     "Lainnya" (teks bebas bisa memuat nama/lokasi orang, tidak boleh bocor).
--   * Pengaduan berstatus 'ditolak' tidak dihitung (menyaring spam/salah kirim).
--   * "Lainnya" tidak ikut daftar peringkat (tidak informatif), tetapi tetap
--     dihitung dalam total supaya persentase jujur.

begin;

create or replace function public.aduan_populer(p_batas integer default 5)
returns table (
  jenis text,
  jumlah bigint,
  total_pengaduan bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with dasar as (
    select
      case
        when pl.jenis_pengaduan = 'Lainnya' or pl.jenis_pengaduan like 'Lainnya:%'
          then 'Lainnya'
        else pl.jenis_pengaduan
      end as jenis
    from public.pengajuan_layanan pl
    where pl.jenis_pengaduan is not null
      and pl.status <> 'ditolak'
  ),
  total as (
    select count(*)::bigint as n from dasar
  )
  select d.jenis, count(*)::bigint as jumlah, (select n from total) as total_pengaduan
  from dasar d
  where d.jenis <> 'Lainnya'
  group by d.jenis
  order by count(*) desc, d.jenis asc
  limit greatest(1, least(coalesce(p_batas, 5), 12));
$$;

revoke all on function public.aduan_populer(integer) from public;
grant execute on function public.aduan_populer(integer) to anon, authenticated, service_role;

commit;
