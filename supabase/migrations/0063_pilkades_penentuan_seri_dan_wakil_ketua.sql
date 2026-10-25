-- Pilkades: (1) penentuan suara seri menurut Perbup 10/2026 Pasal 82-83,
--           (2) jabatan Wakil Ketua pada susunan panitia (Pasal 15, formulir Model C).
--
-- Seri: pemenang = calon seri yang unggul di dusun dengan DPT terbesar; bila masih seri,
-- dusun DPT terbesar berikutnya. Suara per dusun diisi panitia (hanya untuk calon yang seri).
-- Data suara per TPS yang sudah ada TIDAK berubah.
--
-- ROLLBACK (urut):
--   drop function public.pilkades_simpan_suara_dusun(uuid, jsonb);
--   drop function public.pilkades_suara_seri_dusun(uuid, text, integer);
--   drop function public.pilkades_dusun_dpt(uuid);
--   drop table public.pilkades_suara_dusun;
--   (fungsi pilkades_tetapkan_terpilih & pilkades_simpan_panitia: jalankan ulang 0060 dan 0059)
--   alter table public.pilkades_panitia drop constraint pilkades_panitia_jabatan_check;
--   alter table public.pilkades_panitia add constraint pilkades_panitia_jabatan_check
--     check (jabatan in ('ketua','sekretaris','bendahara','anggota'));

begin;

-- 1. Wakil Ketua -------------------------------------------------------------
alter table public.pilkades_panitia drop constraint if exists pilkades_panitia_jabatan_check;
alter table public.pilkades_panitia add constraint pilkades_panitia_jabatan_check
  check (jabatan in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'anggota'));

create or replace function public.pilkades_simpan_panitia(
  p_periode uuid, p_jabatan text, p_nama text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_nama text := trim(coalesce(p_nama, ''));
  v_lama text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_jabatan not in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'anggota') then
    raise exception 'Jabatan tidak valid.';
  end if;
  if length(v_nama) < 3 or length(v_nama) > 100 then
    raise exception 'Nama harus 3 sampai 100 huruf.';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan.';
  end if;

  if p_jabatan = 'anggota' then
    if exists (
      select 1 from public.pilkades_panitia
      where periode_id = p_periode and jabatan = 'anggota'
        and lower(nama) = lower(v_nama)
    ) then
      raise exception 'Nama anggota itu sudah ada.';
    end if;
    insert into public.pilkades_panitia (periode_id, jabatan, nama, created_by)
    values (p_periode, 'anggota', v_nama, auth.uid());
    perform public.pilkades_catat(p_periode, 'ubah_panitia', 'Tambah anggota: ' || v_nama);
  else
    select nama into v_lama from public.pilkades_panitia
    where periode_id = p_periode and jabatan = p_jabatan;

    insert into public.pilkades_panitia (periode_id, jabatan, nama, created_by)
    values (p_periode, p_jabatan, v_nama, auth.uid())
    on conflict (periode_id, jabatan) where jabatan <> 'anggota'
    do update set nama = excluded.nama, created_by = excluded.created_by;

    perform public.pilkades_catat(
      p_periode, 'ubah_panitia',
      initcap(p_jabatan) || ': ' || v_nama
        || case when v_lama is not null and v_lama <> v_nama
                then ' (sebelumnya ' || v_lama || ')' else '' end
    );
  end if;
end;
$$;

-- 2. Suara per dusun (hanya dipakai untuk menentukan pemenang saat seri) -------
create table if not exists public.pilkades_suara_dusun (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  calon_id uuid not null references public.pilkades_calon(id) on delete restrict,
  dusun text not null,
  suara integer not null check (suara >= 0),
  unique (periode_id, calon_id, dusun)
);
revoke all on public.pilkades_suara_dusun from public, anon;
grant select on public.pilkades_suara_dusun to authenticated;
alter table public.pilkades_suara_dusun enable row level security;
drop policy if exists "pilkades_suara_dusun_lihat" on public.pilkades_suara_dusun;
create policy "pilkades_suara_dusun_lihat" on public.pilkades_suara_dusun
  for select to authenticated using (public.boleh_lihat_pilkades());

-- 3. Dusun berdasarkan jumlah DPT (terbesar dulu) ------------------------------
create or replace function public.pilkades_dusun_dpt(p_periode uuid)
returns table (dusun text, jumlah integer)
language sql stable security definer
set search_path = public
as $$
  select coalesce(nullif(trim(i.dusun), ''), '(Tanpa dusun)') as dusun, count(*)::integer as jumlah
  from public.pilkades_daftar_tetap_isi i
  where i.daftar_id = (
    select id from public.pilkades_daftar_tetap
    where periode_id = p_periode and jenis = 'DPT' order by versi desc limit 1)
    and public.boleh_lihat_pilkades()
  group by 1
  order by 2 desc, 1;
$$;

-- 4. Calon yang seri di suara terbanyak + suara mereka di satu dusun -------------
create or replace function public.pilkades_suara_seri_dusun(p_periode uuid, p_dusun text, p_total integer)
returns table (calon_id uuid, suara integer, tercatat boolean)
language sql stable security definer
set search_path = public
as $$
  select c.id, coalesce(d.suara, 0)::integer, (d.id is not null)
  from public.pilkades_calon c
  left join public.pilkades_suara_dusun d
    on d.calon_id = c.id and d.periode_id = p_periode and d.dusun = p_dusun
  where c.periode_id = p_periode and c.status = 'ditetapkan'
    and public.boleh_lihat_pilkades()
    and coalesce((select sum(s.suara) from public.pilkades_suara s where s.calon_id = c.id), 0) = p_total;
$$;

-- 5. Simpan suara per dusun: p_data = { "<nama dusun>": { "<id calon>": jumlah } } ----
create or replace function public.pilkades_simpan_suara_dusun(p_periode uuid, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_dusun text;
  v_calon text;
  v_nilai integer;
  v_total integer;
  v_maks integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if exists (select 1 from public.pilkades_hasil where periode_id = p_periode) then
    raise exception 'Calon terpilih sudah ditetapkan. Batalkan penetapan dulu bila ingin mengubah.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Data tidak valid';
  end if;

  -- calon yang seri = total tertinggi
  select max(t.total) into v_maks from (
    select coalesce(sum(s.suara), 0)::integer as total
    from public.pilkades_calon c left join public.pilkades_suara s on s.calon_id = c.id
    where c.periode_id = p_periode and c.status = 'ditetapkan' group by c.id) t;

  for v_dusun in select jsonb_object_keys(p_data) loop
    if not exists (select 1 from public.pilkades_dusun_dpt(p_periode) x where x.dusun = v_dusun) then
      raise exception 'Dusun "%" tidak ada di DPT', v_dusun;
    end if;
    for v_calon in select jsonb_object_keys(p_data -> v_dusun) loop
      v_nilai := (p_data -> v_dusun ->> v_calon)::integer;
      if v_nilai is null or v_nilai < 0 then
        raise exception 'Suara harus angka 0 atau lebih';
      end if;
      select total into v_total from (
        select c.id, coalesce(sum(s.suara), 0)::integer as total
        from public.pilkades_calon c left join public.pilkades_suara s on s.calon_id = c.id
        where c.periode_id = p_periode and c.status = 'ditetapkan' and c.id = v_calon::uuid
        group by c.id) q;
      if v_total is distinct from v_maks then
        raise exception 'Hanya calon yang seri di suara terbanyak yang perlu diisi per dusun';
      end if;
      insert into public.pilkades_suara_dusun (periode_id, calon_id, dusun, suara)
      values (p_periode, v_calon::uuid, v_dusun, v_nilai)
      on conflict (periode_id, calon_id, dusun) do update set suara = excluded.suara;
    end loop;
  end loop;

  -- Suara satu calon di semua dusun tidak boleh melebihi total suaranya.
  if exists (
    select 1 from public.pilkades_suara_dusun d
    where d.periode_id = p_periode
    group by d.calon_id
    having sum(d.suara) > (select coalesce(sum(s.suara), 0) from public.pilkades_suara s where s.calon_id = d.calon_id)
  ) then
    raise exception 'Jumlah suara per dusun melebihi total suara calon itu. Periksa kembali angkanya.';
  end if;

  perform public.pilkades_catat(p_periode, 'suara_dusun_seri', 'Suara per dusun untuk penentuan seri dicatat');
end;
$$;

-- 6. Penetapan calon terpilih: seri kini diselesaikan lewat dusun ------------------
create or replace function public.pilkades_tetapkan_terpilih(
  p_periode uuid, p_tanggal date, p_nomor text, p_catatan text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_jml_tps integer;
  v_jml_rekap integer;
  v_jml_calon integer;
  v_menang record;
  v_kedua integer;
  v_sah integer;
  v_tidak_sah integer;
  v_dusun record;
  v_pemenang uuid;
  v_maks integer;
  v_jml_maks integer;
  v_ada integer;
  v_dusun_menang text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal penetapan wajib diisi';
  end if;
  if exists (select 1 from public.pilkades_hasil where periode_id = p_periode) then
    raise exception 'Calon terpilih sudah ditetapkan';
  end if;

  select count(*) into v_jml_tps from public.pilkades_tps where periode_id = p_periode;
  select count(*) into v_jml_rekap from public.pilkades_suara_tps where periode_id = p_periode;
  if v_jml_tps = 0 then
    raise exception 'Belum ada TPS';
  end if;
  if v_jml_rekap < v_jml_tps then
    raise exception 'Rekap suara belum lengkap: % dari % TPS sudah diisi', v_jml_rekap, v_jml_tps;
  end if;

  select count(*) into v_jml_calon
  from public.pilkades_calon where periode_id = p_periode and status = 'ditetapkan';
  if v_jml_calon < 1 then
    raise exception 'Belum ada calon yang ditetapkan';
  end if;

  -- Total suara per calon yang ditetapkan, terbanyak dulu.
  select t.calon_id, t.total into v_menang
  from (
    select c.id as calon_id, coalesce(sum(s.suara), 0)::integer as total
    from public.pilkades_calon c
    left join public.pilkades_suara s on s.calon_id = c.id
    where c.periode_id = p_periode and c.status = 'ditetapkan'
    group by c.id
  ) t
  order by t.total desc, t.calon_id limit 1;

  select t.total into v_kedua
  from (
    select c.id as calon_id, coalesce(sum(s.suara), 0)::integer as total
    from public.pilkades_calon c
    left join public.pilkades_suara s on s.calon_id = c.id
    where c.periode_id = p_periode and c.status = 'ditetapkan'
    group by c.id
  ) t
  order by t.total desc, t.calon_id offset 1 limit 1;

  select coalesce(sum(suara), 0)::integer into v_sah
  from public.pilkades_suara where periode_id = p_periode;
  if v_sah = 0 then
    raise exception 'Belum ada suara sah';
  end if;
  if v_kedua is not null and v_kedua = v_menang.total then
    -- SERI: Perbup Pasal 83. Pemenang = calon seri dengan suara terbanyak di dusun
    -- dengan DPT terbesar; bila masih seri, dusun terbesar berikutnya, dan seterusnya.
    for v_dusun in select * from public.pilkades_dusun_dpt(p_periode) loop
      select count(*) into v_ada
      from public.pilkades_suara_seri_dusun(p_periode, v_dusun.dusun, v_menang.total) where tercatat;
      if v_ada = 0 then
        raise exception 'Suara terbanyak seri (Perbup Pasal 83). Isi dulu suara calon yang seri per dusun, mulai dari dusun "%" (DPT terbesar).', v_dusun.dusun;
      end if;
      select max(suara) into v_maks from public.pilkades_suara_seri_dusun(p_periode, v_dusun.dusun, v_menang.total);
      select count(*), min(calon_id::text)::uuid into v_jml_maks, v_pemenang
      from public.pilkades_suara_seri_dusun(p_periode, v_dusun.dusun, v_menang.total) where suara = v_maks;
      if v_jml_maks = 1 then
        v_dusun_menang := v_dusun.dusun;
        exit;
      end if;
      v_pemenang := null;
    end loop;
    if v_pemenang is null then
      raise exception 'Suara calon yang seri sama di semua dusun. Hal ini belum diatur dalam Perbup; tanyakan ke Panitia Kabupaten.';
    end if;
    select v_pemenang as calon_id, v_menang.total as total into v_menang;
  end if;

  select coalesce(sum(suara_tidak_sah), 0) into v_tidak_sah
  from public.pilkades_suara_tps where periode_id = p_periode;

  insert into public.pilkades_hasil
    (periode_id, calon_id, tanggal_penetapan, nomor_berita_acara, catatan,
     suara_calon, suara_sah_total, suara_tidak_sah_total, ditetapkan_oleh, ditetapkan_oleh_nama)
  values
    (p_periode, v_menang.calon_id, p_tanggal, nullif(left(trim(coalesce(p_nomor, '')), 100), ''),
     nullif(left(trim(coalesce(p_catatan, '')), 300), ''),
     v_menang.total, v_sah, v_tidak_sah, auth.uid(),
     (select nama from public.profiles where id = auth.uid()));

  perform public.pilkades_catat(
    p_periode, 'tetapkan_terpilih',
    (select 'No. ' || nomor_urut || ' ' || nama from public.pilkades_calon where id = v_menang.calon_id)
    || ' - ' || v_menang.total || ' dari ' || v_sah || ' suara sah'
    || coalesce(' (seri, ditentukan di dusun ' || v_dusun_menang || ')', '')
  );
  return v_menang.calon_id;
end;
$$;

revoke execute on function public.pilkades_dusun_dpt(uuid), public.pilkades_suara_seri_dusun(uuid, text, integer),
  public.pilkades_simpan_suara_dusun(uuid, jsonb) from public, anon;
grant execute on function public.pilkades_dusun_dpt(uuid), public.pilkades_suara_seri_dusun(uuid, text, integer),
  public.pilkades_simpan_suara_dusun(uuid, jsonb) to authenticated;

commit;
