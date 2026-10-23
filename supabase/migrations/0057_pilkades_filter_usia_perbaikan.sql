-- 0057: Perbaikan filter usia (0056). Idempotent. Prasyarat: 0056.
--
-- Masalah: aturan "sudah/pernah kawin" meloloskan data yang tidak wajar, mis. anak
-- berumur 0 tahun yang status_kawin-nya terisi (data uji/salah ketik), sehingga
-- ikut dianggap cukup usia.
-- Perbaikan: pengecualian kawin hanya berlaku mulai usia 15 tahun. Yang berstatus
-- kawin tetapi di bawah 15 tahun ditandai "Perlu dicek" (bukan lolos, bukan ditolak),
-- dengan catatan otomatis, supaya panitia memeriksa datanya.
-- Setelah 0057, jalankan ulang "Terapkan filter usia" agar baris otomatis dihitung ulang
-- (keputusan manual tetap tidak ditimpa).

begin;

-- Kawin hanya bila status DIKENALI (kawin/menikah/cerai/janda/duda). Nilai asing seperti
-- "-" atau kosong dianggap belum kawin, bukan lolos.
create or replace function public.pilkades_pernah_kawin(p_status text)
returns boolean
language sql immutable
as $$
  select coalesce(trim(p_status), '') ~* '^(kawin|menikah|nikah|cerai|janda|duda|sudah|pernah)'
$$;

drop function if exists public.pilkades_pratinjau_usia(uuid, integer, boolean);
drop function if exists public.pilkades_terapkan_usia(uuid, integer, boolean, boolean);

create or replace function public.pilkades_pratinjau_usia(
  p_periode uuid, p_usia integer, p_kawin boolean
)
returns table (
  total integer, layak integer, di_bawah_usia integer, perlu_dicek integer,
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
  with k as (
    select pm.id,
           (pm.status_verifikasi = 'belum' or pm.status_otomatis) as dihitung,
           extract(year from age(v_acuan, w.tanggal_lahir))::int as umur,
           (p_kawin and public.pilkades_pernah_kawin(w.status_kawin)) as kawin
    from public.pilkades_pemilih pm
    join public.warga w on w.id = pm.warga_id
    where pm.periode_id = p_periode
  )
  select
    count(*)::int,
    (count(*) filter (where dihitung and (umur >= p_usia or (kawin and umur >= 15))))::int,
    (count(*) filter (where dihitung and umur < p_usia and not kawin))::int,
    (count(*) filter (where dihitung and umur < p_usia and kawin and umur < 15))::int,
    (count(*) filter (where not dihitung))::int,
    v_acuan
  from k;
end;
$$;

create or replace function public.pilkades_terapkan_usia(
  p_periode uuid, p_usia integer, p_kawin boolean, p_tandai_memenuhi boolean
)
returns table (memenuhi integer, tidak_memenuhi integer, perlu_dicek integer, belum integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_acuan date;
  v_m integer; v_t integer; v_p integer; v_b integer;
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
           extract(year from age(v_acuan, w.tanggal_lahir))::int as umur,
           (p_kawin and public.pilkades_pernah_kawin(w.status_kawin)) as kawin
    from public.pilkades_pemilih pm
    join public.warga w on w.id = pm.warga_id
    where pm.periode_id = p_periode
      and (pm.status_verifikasi = 'belum' or pm.status_otomatis)
  ),
  kelas as (
    select id, umur,
           case when umur >= p_usia or (kawin and umur >= 15) then 'layak'
                when kawin then 'aneh'
                else 'kurang' end as k
    from hitung
  ),
  upd as (
    update public.pilkades_pemilih pm
    set status_verifikasi = case kl.k
          when 'kurang' then 'tidak_memenuhi'
          when 'aneh' then 'perlu_dicek'
          when 'layak' then case when p_tandai_memenuhi then 'memenuhi_syarat' else 'belum' end
        end,
        status_otomatis = (kl.k <> 'layak') or p_tandai_memenuhi,
        catatan = case kl.k
          when 'kurang' then 'Otomatis: usia kurang dari ' || p_usia || ' tahun pada ' || to_char(v_acuan, 'DD-MM-YYYY')
          when 'aneh' then 'Otomatis: status kawin tidak wajar untuk usia ' || kl.umur || ' tahun, periksa data warga'
          else case when pm.catatan like 'Otomatis:%' then null else pm.catatan end
        end,
        diverifikasi_oleh = auth.uid(),
        diverifikasi_pada = now()
    from kelas kl
    where pm.id = kl.id
    returning pm.status_verifikasi as st
  )
  select count(*) filter (where st = 'memenuhi_syarat'),
         count(*) filter (where st = 'tidak_memenuhi'),
         count(*) filter (where st = 'perlu_dicek'),
         count(*) filter (where st = 'belum')
  into v_m, v_t, v_p, v_b from upd;

  update public.pilkades_periode
  set usia_minimum = p_usia, termasuk_pernah_kawin = p_kawin
  where id = p_periode;

  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, 'terapkan_filter_usia',
          'Usia minimum ' || p_usia || ' tahun' ||
          case when p_kawin then ' (atau sudah/pernah kawin, min. 15 tahun)' else '' end ||
          ' pada ' || to_char(v_acuan, 'DD-MM-YYYY') ||
          ': ' || v_t || ' tidak memenuhi, ' || v_p || ' perlu dicek, ' || v_m ||
          ' ditandai memenuhi, ' || v_b || ' belum diperiksa',
          auth.uid(), (select nama from public.profiles where id = auth.uid()));

  return query select v_m, v_t, v_p, v_b;
end;
$$;

revoke execute on function public.pilkades_pratinjau_usia(uuid, integer, boolean) from public, anon;
revoke execute on function public.pilkades_terapkan_usia(uuid, integer, boolean, boolean) from public, anon;
grant  execute on function public.pilkades_pratinjau_usia(uuid, integer, boolean) to authenticated;
grant  execute on function public.pilkades_terapkan_usia(uuid, integer, boolean, boolean) to authenticated;

commit;
