-- Fase 2 - Tambahan: RPC agregat untuk kartu statistik di beranda publik
-- (jumlah penduduk, jumlah kepala keluarga, jumlah ajuan yang sudah diproses).
-- Jalankan SETELAH 0001-0007.
--
-- CATATAN KEAMANAN (lihat docs/SECURITY.md): tabel `warga` dan
-- `pengajuan_layanan` TIDAK punya policy select untuk anon. Function ini
-- HANYA mengembalikan tiga angka agregat (count), TIDAK ADA data individu
-- (nama, NIK, alamat, dst) yang ikut ter-expose — jadi aman dipanggil dari
-- halaman publik tanpa login.

create or replace function public.statistik_beranda()
returns table (
  total_penduduk bigint,
  total_kepala_keluarga bigint,
  total_ajuan_diproses bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.warga) as total_penduduk,
    (
      select count(distinct no_kk)
      from public.warga
      where no_kk is not null and no_kk <> ''
    ) as total_kepala_keluarga,
    (
      select count(*)
      from public.pengajuan_layanan
      where status <> 'diajukan'
    ) as total_ajuan_diproses;
$$;

grant execute on function public.statistik_beranda() to anon, authenticated;
