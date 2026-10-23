-- 0058: Penjaga usia saat menetapkan DPS/DPT. Idempotent. Prasyarat: 0052, 0056, 0057.
--
-- Penetapan DITOLAK bila masih ada pemilih berstatus "Memenuhi syarat" yang usianya
-- di bawah batas periode (kecuali lolos lewat aturan kawin, min. 15 tahun).
-- Arsip yang sudah ditetapkan TIDAK berubah; koreksi = tetapkan versi baru.

begin;

create or replace function public.pilkades_tetapkan_daftar(
  p_periode uuid, p_jenis text, p_tanggal date, p_nomor text, p_catatan text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_versi integer;
  v_jumlah integer;
  v_nama text;
  v_acuan date;
  v_usia integer;
  v_kawin boolean;
  v_muda integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_jenis not in ('DPS', 'DPT') then
    raise exception 'Jenis daftar tidak valid.';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal penetapan wajib diisi.';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan.';
  end if;
  if p_jenis = 'DPT' and not exists (
    select 1 from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = 'DPS'
  ) then
    raise exception 'DPT hanya bisa ditetapkan setelah ada DPS.';
  end if;

  select count(*) into v_jumlah
  from public.pilkades_pemilih
  where periode_id = p_periode and status_verifikasi = 'memenuhi_syarat';
  if v_jumlah = 0 then
    raise exception 'Belum ada pemilih berstatus "Memenuhi syarat".';
  end if;

  -- PENJAGA USIA: tolak bila ada yang "memenuhi syarat" tetapi usianya di bawah batas periode.
  select coalesce(tanggal_pemungutan, current_date), usia_minimum, termasuk_pernah_kawin
    into v_acuan, v_usia, v_kawin
  from public.pilkades_periode where id = p_periode;

  select count(*) into v_muda
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  where pm.periode_id = p_periode and pm.status_verifikasi = 'memenuhi_syarat'
    and extract(year from age(v_acuan, w.tanggal_lahir)) < v_usia
    and not (v_kawin and public.pilkades_pernah_kawin(w.status_kawin)
             and extract(year from age(v_acuan, w.tanggal_lahir)) >= 15);
  if v_muda > 0 then
    raise exception '% pemilih berstatus "Memenuhi syarat" tetapi usianya kurang dari % tahun. Terapkan ulang filter usia atau koreksi datanya dulu.', v_muda, v_usia;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_periode::text || p_jenis));
  select coalesce(max(versi), 0) + 1 into v_versi
  from public.pilkades_daftar_tetap where periode_id = p_periode and jenis = p_jenis;

  select nama into v_nama from public.profiles where id = auth.uid();

  insert into public.pilkades_daftar_tetap
    (periode_id, jenis, versi, tanggal_penetapan, nomor_berita_acara, catatan, jumlah,
     ditetapkan_oleh, ditetapkan_oleh_nama)
  values (p_periode, p_jenis, v_versi, p_tanggal, nullif(trim(p_nomor), ''),
          nullif(trim(p_catatan), ''), v_jumlah, auth.uid(), v_nama)
  returning id into v_id;

  insert into public.pilkades_daftar_tetap_isi
    (daftar_id, urut, warga_id, nama_lengkap, nik_samar, jenis_kelamin, tempat_lahir,
     tanggal_lahir, dusun, rt, rw, alamat, tps_nama)
  select v_id,
         row_number() over (order by w.dusun nulls last, w.nama_lengkap, pm.id),
         w.id, w.nama_lengkap,
         left(w.nik, 4) || repeat('*', greatest(length(w.nik) - 6, 0)) || right(w.nik, 2),
         w.jenis_kelamin, w.tempat_lahir, w.tanggal_lahir, w.dusun, w.rt, w.rw, w.alamat,
         t.nama
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  left join public.pilkades_tps t on t.id = pm.tps_id
  where pm.periode_id = p_periode and pm.status_verifikasi = 'memenuhi_syarat';

  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, 'tetapkan_' || lower(p_jenis),
          p_jenis || ' versi ' || v_versi || ', ' || v_jumlah || ' pemilih',
          auth.uid(), v_nama);

  return v_id;
end;
$$;

revoke execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) from public, anon;
grant  execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) to authenticated;

commit;
