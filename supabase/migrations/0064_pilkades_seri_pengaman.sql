-- 0064: Pengaman penentuan suara seri (menambal 0063; rancangan 0063 tidak diubah).
-- Dasar: Perbup 10/2026 Pasal 82-83. Idempotent. Prasyarat: 0060 dan 0063.
--
-- Tiga celah yang ditutup, semuanya bisa membuat calon yang salah ditetapkan:
--  1. DATA BASI. Suara per dusun disimpan saat seri. Bila rekap TPS lalu dikoreksi, angka dusun
--     lama bisa ikut menentukan pemenang untuk pasangan calon seri yang BERBEDA. Sekarang setiap
--     perubahan rekap suara TPS menghapus rincian dusun periode itu; panitia mengisi ulang.
--  2. ISIAN SEBAGIAN. Bila hanya sebagian calon seri yang diisi di sebuah dusun, calon lain
--     dianggap 0 dan bisa kalah tanpa dihitung. Sekarang semua calon seri wajib diisi
--     (isi 0 bila tidak ada suara) sebelum dusun itu dipakai.
--  3. DPT SAMA BESAR. Dua dusun dengan jumlah DPT sama diurutkan menurut abjad nama dusun,
--     padahal Perbup tidak mengatur itu; hasil bisa berubah hanya karena nama dusun. Sekarang
--     penentuan BERHENTI saat sampai ke dusun yang DPT-nya sama besar dengan dusun lain.
--
-- TIDAK diubah (tafsir Anda tetap): pada dusun berikutnya, SEMUA calon seri dibandingkan lagi,
-- termasuk yang sudah kalah di dusun lebih besar. Ini perlu dikonfirmasi ke Panitia Kabupaten
-- (lihat catatan di BACA-PAKET-A-PERBUP.txt).
--
-- ROLLBACK: drop trigger pilkades_suara_hapus_rincian_dusun on public.pilkades_suara;
--           drop function public.pilkades_hapus_rincian_dusun();
--           lalu jalankan ulang fungsi pilkades_tetapkan_terpilih dari 0063.

begin;

-- 1. Hapus rincian dusun setiap kali rekap suara TPS berubah ---------------------------
create or replace function public.pilkades_hapus_rincian_dusun()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.pilkades_suara_dusun
  where periode_id = coalesce(new.periode_id, old.periode_id);
  return null;
end;
$$;
revoke execute on function public.pilkades_hapus_rincian_dusun() from public, anon, authenticated;

drop trigger if exists pilkades_suara_hapus_rincian_dusun on public.pilkades_suara;
create trigger pilkades_suara_hapus_rincian_dusun
  after insert or update or delete on public.pilkades_suara
  for each row execute function public.pilkades_hapus_rincian_dusun();

-- 2 dan 3. Penetapan: isian harus lengkap, dan berhenti di dusun DPT sama besar ----------
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
  v_seri integer;
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
    -- SERI: Perbup Pasal 83.
    select count(*) into v_seri
    from public.pilkades_suara_seri_dusun(p_periode, '', v_menang.total);

    for v_dusun in
      select d.dusun, d.jumlah, (count(*) over (partition by d.jumlah))::integer as sama
      from public.pilkades_dusun_dpt(p_periode) d
      order by d.jumlah desc, d.dusun
    loop
      if v_dusun.sama > 1 then
        raise exception 'Penentuan seri sampai ke dusun yang jumlah DPT-nya sama besar dengan dusun lain (% pemilih, termasuk "%"). Perbup tidak mengatur urutan dusun yang sama besar; tanyakan ke Panitia Kabupaten.', v_dusun.jumlah, v_dusun.dusun;
      end if;

      select count(*) into v_ada
      from public.pilkades_suara_seri_dusun(p_periode, v_dusun.dusun, v_menang.total) where tercatat;
      if v_ada = 0 then
        raise exception 'Suara terbanyak seri (Perbup Pasal 83). Isi dulu suara calon yang seri per dusun, mulai dari dusun "%" (DPT terbesar).', v_dusun.dusun;
      end if;
      if v_ada < v_seri then
        raise exception 'Suara calon yang seri di dusun "%" belum lengkap. Isi semua calon yang seri (isi 0 bila tidak ada suara).', v_dusun.dusun;
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

revoke execute on function public.pilkades_tetapkan_terpilih(uuid, date, text, text) from public, anon;
grant  execute on function public.pilkades_tetapkan_terpilih(uuid, date, text, text) to authenticated;

commit;
