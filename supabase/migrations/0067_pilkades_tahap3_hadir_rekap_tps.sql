-- 0067: Pilkades - Tahap 3 "Daftar hadir jadi dokumen cetak, hari-H hanya rekap angka per TPS".
-- Idempotent. Prasyarat: 0054, 0055, 0060, 0064, 0065, 0066 sudah dijalankan.
--
-- ISI
--  1. Jumlah pemilih hadir sekarang ANGKA per TPS (kolom hadir di pilkades_suara_tps),
--     diisi panitia bersama suara tiap calon. Tidak ada lagi pencatatan hadir per orang.
--     Data lama dipindahkan: hadir per TPS dihitung dari catatan di pilkades_hadir.
--  2. Validasi suara disesuaikan (pilkades_simpan_suara):
--       - jumlah hadir wajib diisi, tidak boleh melebihi pemilih terdaftar di TPS itu
--         (DPT + Pemilih Tambahan);
--       - suara sah + tidak sah tidak boleh melebihi jumlah hadir.
--  3. pilkades_catat_hadir dan pilkades_batal_hadir ditolak database (bukan sekadar tombol
--     yang disembunyikan). Tabel pilkades_hadir tidak dihapus; isinya tinggal sebagai arsip.
--  4. Pemilih Tambahan tidak bisa ditambah atau dibatalkan bila rekap TPS-nya sudah diisi
--     (angka hadir sudah memakai jumlah terdaftar saat itu).
--
-- ROLLBACK: lihat akhir file.

begin;

-- 1. Kolom hadir per TPS ----------------------------------------------------------------------
alter table public.pilkades_suara_tps
  add column if not exists hadir integer;

-- Pindahkan data lama: hadir = catatan hadir TPS itu (minimal sebesar suara yang sudah tercatat).
update public.pilkades_suara_tps st
set hadir = greatest(
  (select count(*) from public.pilkades_hadir h
    join public.pilkades_tps t on t.id = st.tps_id
   where h.periode_id = st.periode_id and h.tps_nama = t.nama),
  st.suara_tidak_sah + coalesce((select sum(s.suara) from public.pilkades_suara s where s.tps_id = st.tps_id), 0)
)
where st.hadir is null;

alter table public.pilkades_suara_tps alter column hadir set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pilkades_suara_tps_hadir_cek' and conrelid = 'public.pilkades_suara_tps'::regclass
  ) then
    alter table public.pilkades_suara_tps
      add constraint pilkades_suara_tps_hadir_cek check (hadir >= 0);
  end if;
end $$;

-- 2. Simpan rekap satu TPS (diganti dari 0060: tambah p_hadir) ---------------------------------
drop function if exists public.pilkades_simpan_suara(uuid, uuid, jsonb, integer);

create or replace function public.pilkades_simpan_suara(
  p_periode uuid, p_tps uuid, p_suara jsonb, p_tidak_sah integer, p_hadir integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_tps public.pilkades_tps%rowtype;
  v_calon record;
  v_nilai integer;
  v_sah integer := 0;
  v_daftar uuid;
  v_terdaftar integer;
  v_ringkas text := '';
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if exists (select 1 from public.pilkades_hasil where periode_id = p_periode) then
    raise exception 'Calon terpilih sudah ditetapkan. Batalkan penetapan dulu bila suara perlu diubah.';
  end if;

  select * into v_tps from public.pilkades_tps where id = p_tps and periode_id = p_periode;
  if not found then
    raise exception 'TPS tidak ditemukan';
  end if;
  if p_hadir is null or p_hadir < 0 then
    raise exception 'Jumlah pemilih yang hadir harus berupa angka 0 atau lebih';
  end if;
  if p_tidak_sah is null or p_tidak_sah < 0 then
    raise exception 'Suara tidak sah harus berupa angka 0 atau lebih';
  end if;
  if p_suara is null or jsonb_typeof(p_suara) <> 'object' then
    raise exception 'Data suara tidak valid';
  end if;
  if not exists (select 1 from public.pilkades_calon where periode_id = p_periode and status = 'ditetapkan') then
    raise exception 'Belum ada calon yang ditetapkan';
  end if;

  -- Tidak boleh ada kunci selain calon yang ditetapkan di periode ini.
  if exists (
    select 1 from jsonb_object_keys(p_suara) k
    where k not in (select id::text from public.pilkades_calon
                    where periode_id = p_periode and status = 'ditetapkan')
  ) then
    raise exception 'Ada calon yang tidak valid';
  end if;

  for v_calon in
    select id, nomor_urut from public.pilkades_calon
    where periode_id = p_periode and status = 'ditetapkan'
    order by nomor_urut
  loop
    if not (p_suara ? v_calon.id::text) then
      raise exception 'Suara calon nomor % belum diisi (isi 0 bila tidak ada)', v_calon.nomor_urut;
    end if;
    begin
      v_nilai := (p_suara ->> v_calon.id::text)::integer;
    exception when others then
      raise exception 'Suara calon nomor % harus berupa angka bulat', v_calon.nomor_urut;
    end;
    if v_nilai is null or v_nilai < 0 then
      raise exception 'Suara calon nomor % harus 0 atau lebih', v_calon.nomor_urut;
    end if;
    v_sah := v_sah + v_nilai;
  end loop;

  -- Pemilih terdaftar di TPS ini = DPT resmi + Pemilih Tambahan.
  select id into v_daftar from public.pilkades_daftar_tetap
  where periode_id = p_periode and jenis = 'DPT'
  order by versi desc limit 1;
  if v_daftar is null then
    raise exception 'DPT belum ditetapkan';
  end if;
  select
    (select count(*) from public.pilkades_daftar_tetap_isi where daftar_id = v_daftar and tps_nama = v_tps.nama)
    + (select count(*) from public.pilkades_pemilih_tambahan where periode_id = p_periode and tps_nama = v_tps.nama)
  into v_terdaftar;

  if p_hadir > v_terdaftar then
    raise exception 'Jumlah hadir (%) melebihi pemilih yang terdaftar di % (%: DPT + Pemilih Tambahan). Periksa angkanya.',
      p_hadir, v_tps.nama, v_terdaftar;
  end if;
  if v_sah + p_tidak_sah > p_hadir then
    raise exception 'Jumlah suara (% sah + % tidak sah) melebihi jumlah pemilih yang hadir di % (%). Periksa angka hadir dan suara.',
      v_sah, p_tidak_sah, v_tps.nama, p_hadir;
  end if;

  delete from public.pilkades_suara where tps_id = p_tps;
  for v_calon in
    select id, nomor_urut from public.pilkades_calon
    where periode_id = p_periode and status = 'ditetapkan'
    order by nomor_urut
  loop
    v_nilai := (p_suara ->> v_calon.id::text)::integer;
    insert into public.pilkades_suara (periode_id, tps_id, calon_id, suara)
    values (p_periode, p_tps, v_calon.id, v_nilai);
    v_ringkas := v_ringkas || ' no.' || v_calon.nomor_urut || '=' || v_nilai;
  end loop;

  insert into public.pilkades_suara_tps (tps_id, periode_id, suara_tidak_sah, hadir, dicatat_oleh, dicatat_oleh_nama, dicatat_pada)
  values (p_tps, p_periode, p_tidak_sah, p_hadir, auth.uid(),
          (select nama from public.profiles where id = auth.uid()), now())
  on conflict (tps_id) do update
    set suara_tidak_sah = excluded.suara_tidak_sah,
        hadir = excluded.hadir,
        dicatat_oleh = excluded.dicatat_oleh,
        dicatat_oleh_nama = excluded.dicatat_oleh_nama,
        dicatat_pada = excluded.dicatat_pada;

  perform public.pilkades_catat(
    p_periode, 'simpan_suara',
    v_tps.nama || ': hadir=' || p_hadir || ',' || v_ringkas || ', tidak sah=' || p_tidak_sah
  );
end;
$$;

revoke execute on function public.pilkades_simpan_suara(uuid, uuid, jsonb, integer, integer) from public, anon;
grant  execute on function public.pilkades_simpan_suara(uuid, uuid, jsonb, integer, integer) to authenticated;

-- 3. Catat hadir per orang: ditolak database ---------------------------------------------------
create or replace function public.pilkades_catat_hadir(p_periode uuid, p_warga uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'Pencatatan hadir per orang sudah ditiadakan. Daftar hadir dicetak dan ditandatangani pemilih; panitia hanya memasukkan jumlah hadir per TPS di Hasil Suara.';
end;
$$;

create or replace function public.pilkades_batal_hadir(p_periode uuid, p_warga uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'Pencatatan hadir per orang sudah ditiadakan. Perbaiki jumlah hadir lewat Hasil Suara.';
end;
$$;

revoke execute on function public.pilkades_catat_hadir(uuid, uuid)       from public, anon;
revoke execute on function public.pilkades_batal_hadir(uuid, uuid, text) from public, anon;
grant  execute on function public.pilkades_catat_hadir(uuid, uuid)       to authenticated;
grant  execute on function public.pilkades_batal_hadir(uuid, uuid, text) to authenticated;

-- 4. Pemilih Tambahan terkunci setelah rekap TPS-nya diisi ---------------------------------------
create or replace function public.pilkades_tambahan_kunci_rekap()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r public.pilkades_pemilih_tambahan%rowtype;
begin
  -- SQL Editor / kunci layanan (tanpa pengguna login) tetap boleh untuk perbaikan darurat.
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if exists (
    select 1
    from public.pilkades_suara_tps st
    join public.pilkades_tps t on t.id = st.tps_id
    where t.periode_id = r.periode_id and t.nama = r.tps_nama
  ) then
    raise exception 'Rekap suara % sudah diisi, jadi Pemilih Tambahan untuk TPS ini tidak bisa ditambah atau dibatalkan lagi.', r.tps_nama;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists pilkades_tambahan_kunci_rekap on public.pilkades_pemilih_tambahan;
create trigger pilkades_tambahan_kunci_rekap
  before insert or delete on public.pilkades_pemilih_tambahan
  for each row execute function public.pilkades_tambahan_kunci_rekap();

commit;

-- ROLLBACK (manual):
--   drop trigger if exists pilkades_tambahan_kunci_rekap on public.pilkades_pemilih_tambahan;
--   drop function if exists public.pilkades_tambahan_kunci_rekap();
--   drop function if exists public.pilkades_simpan_suara(uuid, uuid, jsonb, integer, integer);
--   (lalu jalankan ulang fungsi pilkades_simpan_suara dari 0060, fungsi catat/batal hadir dari
--    0066 dan 0055; kolom hadir di pilkades_suara_tps boleh dibiarkan)
