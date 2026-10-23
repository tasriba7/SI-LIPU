-- 0056: Pilkades - saring calon pemilih otomatis berdasarkan usia minimum.
-- Idempotent. Prasyarat: 0051, 0052, 0055 sudah dijalankan.
--
-- ATURAN:
--  * Usia dihitung pada TANGGAL PEMUNGUTAN periode (kalau belum diisi: hari ini).
--  * Layak = usia >= minimum, ATAU (opsional) sudah/pernah kawin. Pilihan ini ada
--    karena banyak aturan Pilkades daerah memakai "17 tahun atau sudah/pernah kawin".
--  * Hanya baris berstatus 'belum' atau yang sebelumnya diisi OTOMATIS yang diubah.
--    Keputusan yang diisi panitia secara manual TIDAK pernah ditimpa.
--  * Yang tidak layak diberi status 'tidak_memenuhi'. Yang layak tetap 'belum'
--    (karena syarat lain, mis. domisili, masih dicek manual) kecuali panitia
--    memilih menandainya 'memenuhi_syarat' sekaligus.
--  * Hanya panitia yang menerapkan; admin dan panitia boleh melihat pratinjau.
--  * Penerapan dicatat di Riwayat Aktivitas.
--
-- ROLLBACK: alter table pilkades_periode drop column usia_minimum, drop column termasuk_pernah_kawin;
--           alter table pilkades_pemilih drop column status_otomatis;
--           drop function pilkades_pratinjau_usia, pilkades_terapkan_usia;

begin;

alter table public.pilkades_periode
  add column if not exists usia_minimum smallint not null default 17
    check (usia_minimum between 0 and 120),
  add column if not exists termasuk_pernah_kawin boolean not null default true;

alter table public.pilkades_pemilih
  add column if not exists status_otomatis boolean not null default false;

-- Sudah/pernah kawin: status_kawin terisi dan tidak diawali "belum"/"tidak".
create or replace function public.pilkades_pernah_kawin(p_status text)
returns boolean
language sql immutable
as $$
  select coalesce(nullif(trim(p_status), ''), 'belum') !~* '^(belum|tidak)'
$$;

-- 1. Pratinjau: hitung saja, tidak mengubah apa pun ------------------------------
create or replace function public.pilkades_pratinjau_usia(
  p_periode uuid, p_usia integer, p_kawin boolean
)
returns table (
  total integer, layak integer, di_bawah_usia integer,
  dikunci_manual integer, tanggal_acuan date
)
language plpgsql stable security definer
set search_path = public
as $$
declare v_acuan date;
begin
  if not public.boleh_lihat_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_usia is null or p_usia < 0 or p_usia > 120 then
    raise exception 'Usia minimum tidak valid.';
  end if;
  select coalesce(tanggal_pemungutan, current_date) into v_acuan
  from public.pilkades_periode where id = p_periode;
  if v_acuan is null then raise exception 'Periode tidak ditemukan.'; end if;

  return query
  select
    count(*)::int,
    (count(*) filter (where (pm.status_verifikasi = 'belum' or pm.status_otomatis)
      and (extract(year from age(v_acuan, w.tanggal_lahir)) >= p_usia
           or (p_kawin and public.pilkades_pernah_kawin(w.status_kawin)))))::int,
    (count(*) filter (where (pm.status_verifikasi = 'belum' or pm.status_otomatis)
      and not (extract(year from age(v_acuan, w.tanggal_lahir)) >= p_usia
           or (p_kawin and public.pilkades_pernah_kawin(w.status_kawin)))))::int,
    (count(*) filter (where not (pm.status_verifikasi = 'belum' or pm.status_otomatis)))::int,
    v_acuan
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  where pm.periode_id = p_periode;
end;
$$;

-- 2. Terapkan (hanya panitia) -------------------------------------------------------
create or replace function public.pilkades_terapkan_usia(
  p_periode uuid, p_usia integer, p_kawin boolean, p_tandai_memenuhi boolean
)
returns table (memenuhi integer, tidak_memenuhi integer, belum integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_acuan date;
  v_m integer; v_t integer; v_b integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_usia is null or p_usia < 0 or p_usia > 120 then
    raise exception 'Usia minimum tidak valid.';
  end if;
  select coalesce(tanggal_pemungutan, current_date) into v_acuan
  from public.pilkades_periode where id = p_periode;
  if v_acuan is null then raise exception 'Periode tidak ditemukan.'; end if;

  with hitung as (
    select pm.id,
           (extract(year from age(v_acuan, w.tanggal_lahir)) >= p_usia
            or (p_kawin and public.pilkades_pernah_kawin(w.status_kawin))) as layak
    from public.pilkades_pemilih pm
    join public.warga w on w.id = pm.warga_id
    where pm.periode_id = p_periode
      and (pm.status_verifikasi = 'belum' or pm.status_otomatis)
  ),
  upd as (
    update public.pilkades_pemilih pm
    set status_verifikasi = case
          when not h.layak then 'tidak_memenuhi'
          when p_tandai_memenuhi then 'memenuhi_syarat'
          else 'belum' end,
        status_otomatis = (not h.layak) or p_tandai_memenuhi,
        catatan = case
          when not h.layak then 'Otomatis: usia kurang dari ' || p_usia || ' tahun pada ' || to_char(v_acuan, 'DD-MM-YYYY')
          when pm.catatan like 'Otomatis:%' then null
          else pm.catatan end,
        diverifikasi_oleh = auth.uid(),
        diverifikasi_pada = now()
    from hitung h
    where pm.id = h.id
    returning pm.status_verifikasi as st
  )
  select count(*) filter (where st = 'memenuhi_syarat'),
         count(*) filter (where st = 'tidak_memenuhi'),
         count(*) filter (where st = 'belum')
  into v_m, v_t, v_b from upd;

  update public.pilkades_periode
  set usia_minimum = p_usia, termasuk_pernah_kawin = p_kawin
  where id = p_periode;

  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, 'terapkan_filter_usia',
          'Usia minimum ' || p_usia || ' tahun' ||
          case when p_kawin then ' (atau sudah/pernah kawin)' else '' end ||
          ' pada ' || to_char(v_acuan, 'DD-MM-YYYY') ||
          ': ' || v_t || ' tidak memenuhi, ' || v_m || ' ditandai memenuhi, ' || v_b || ' belum diperiksa',
          auth.uid(), (select nama from public.profiles where id = auth.uid()));

  return query select v_m, v_t, v_b;
end;
$$;

revoke execute on function public.pilkades_pernah_kawin(text) from public, anon;
revoke execute on function public.pilkades_pratinjau_usia(uuid, integer, boolean) from public, anon;
revoke execute on function public.pilkades_terapkan_usia(uuid, integer, boolean, boolean) from public, anon;
grant  execute on function public.pilkades_pernah_kawin(text) to authenticated;
grant  execute on function public.pilkades_pratinjau_usia(uuid, integer, boolean) to authenticated;
grant  execute on function public.pilkades_terapkan_usia(uuid, integer, boolean, boolean) to authenticated;

commit;
