-- Fase 2 - Tambahan: RPC agregat RINCIAN untuk tabel-tabel informasi di
-- beranda publik (jumlah penduduk per agama, status pernikahan, jenis
-- kelamin, rentang usia, dan pekerjaan).
-- Jalankan SETELAH 0001-0008.
--
-- CATATAN KEAMANAN (lihat docs/SECURITY.md): sama seperti statistik_beranda()
-- di 0008, function ini HANYA mengembalikan angka-angka agregat per kategori
-- (count per kelompok), TIDAK ADA data individu (nama, NIK, alamat, tanggal
-- lahir per orang, dst) yang ikut ter-expose — jadi aman dipanggil dari
-- halaman publik tanpa login.

create or replace function public.statistik_beranda_detail()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with usia as (
    select
      case
        when tanggal_lahir is null then null
        else date_part('year', age(current_date, tanggal_lahir))::int
      end as umur
    from public.warga
  ),
  usia_kelompok as (
    select
      case
        when umur is null then 'Belum Diisi'
        when umur between 0 and 6 then '0-6 Tahun'
        when umur between 7 and 15 then '7-15 Tahun'
        when umur between 16 and 18 then '16-18 Tahun'
        when umur between 19 and 25 then '19-25 Tahun'
        when umur between 26 and 35 then '26-35 Tahun'
        when umur between 36 and 45 then '36-45 Tahun'
        when umur between 46 and 55 then '46-55 Tahun'
        when umur between 56 and 65 then '56-65 Tahun'
        else '65+ Tahun'
      end as kelompok,
      case
        when umur is null then 99
        when umur between 0 and 6 then 1
        when umur between 7 and 15 then 2
        when umur between 16 and 18 then 3
        when umur between 19 and 25 then 4
        when umur between 26 and 35 then 5
        when umur between 36 and 45 then 6
        when umur between 46 and 55 then 7
        when umur between 56 and 65 then 8
        else 9
      end as urutan
    from usia
  ),
  pekerjaan_semua as (
    select
      coalesce(nullif(trim(pekerjaan), ''), 'Belum Diisi') as label,
      count(*) as jumlah
    from public.warga
    group by 1
  ),
  pekerjaan_top as (
    select label, jumlah
    from pekerjaan_semua
    order by jumlah desc, label asc
    limit 8
  ),
  pekerjaan_sisa as (
    select
      'Lainnya' as label,
      coalesce(sum(jumlah), 0) as jumlah
    from pekerjaan_semua
    where label not in (select label from pekerjaan_top)
  )
  select jsonb_build_object(

    'per_agama', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(agama), ''), 'Belum Diisi') as label, count(*) as jumlah
        from public.warga
        group by 1
      ) t
    ),

    'per_status_kawin', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(status_kawin), ''), 'Belum Diisi') as label, count(*) as jumlah
        from public.warga
        group by 1
      ) t
    ),

    'per_jenis_kelamin', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by urutan), '[]'::jsonb)
      from (
        select
          case jenis_kelamin
            when 'L' then 'Laki-laki'
            when 'P' then 'Perempuan'
            else 'Belum Diisi'
          end as label,
          case jenis_kelamin when 'L' then 1 when 'P' then 2 else 3 end as urutan,
          count(*) as jumlah
        from public.warga
        group by 1, 2
      ) t
    ),

    'per_rentang_usia', (
      select coalesce(jsonb_agg(jsonb_build_object('label', kelompok, 'jumlah', jumlah) order by urutan), '[]'::jsonb)
      from (
        select kelompok, urutan, count(*) as jumlah
        from usia_kelompok
        group by kelompok, urutan
      ) t
    ),

    'per_pekerjaan', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'jumlah', jumlah) order by jumlah desc), '[]'::jsonb)
      from (
        select label, jumlah from pekerjaan_top
        union all
        select label, jumlah from pekerjaan_sisa where jumlah > 0
      ) t
    )

  );
$$;

grant execute on function public.statistik_beranda_detail() to anon, authenticated;
