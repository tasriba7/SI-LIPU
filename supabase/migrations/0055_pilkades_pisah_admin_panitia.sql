-- 0055: Pisahkan tugas Admin dan Panitia Pilkades.
-- Idempotent. Prasyarat: 0051, 0052, 0054 sudah dijalankan.
--
-- ATURAN BARU:
--   Admin   : membuat/mengaktifkan periode, membuat akun panitia; MELIHAT semua data
--             Pilkades (hanya baca) termasuk Riwayat. Tidak bisa mengubah data operasional.
--   Panitia : mengubah pemilih, TPS, DPS/DPT, calon, daftar hadir (pembatalan hadir
--             wajib alasan, tercatat di Riwayat). Tidak bisa mengubah periode.
--
-- Pembatasan dipasang di DATABASE (RLS + fungsi), bukan hanya menyembunyikan tombol.
--
-- ROLLBACK: jalankan ulang bagian fungsi/policy dari 0051, 0052, 0054.

begin;

-- 1. Dua level akses ----------------------------------------------------------
-- boleh_lihat_pilkades  : admin ATAU panitia (baca)
-- boleh_kelola_pilkades : HANYA panitia (tulis)
create or replace function public.boleh_lihat_pilkades()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.role in ('admin', 'panitia_pilkades')
                   from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.boleh_kelola_pilkades()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.role = 'panitia_pilkades'
                   from public.profiles p where p.id = auth.uid()), false)
$$;

revoke execute on function public.boleh_lihat_pilkades() from public, anon;
grant  execute on function public.boleh_lihat_pilkades() to authenticated;

-- 2. Policy BACA: admin + panitia ------------------------------------------------
drop policy if exists "pilkades_periode_lihat" on public.pilkades_periode;
create policy "pilkades_periode_lihat" on public.pilkades_periode
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_pemilih_lihat" on public.pilkades_pemilih;
create policy "pilkades_pemilih_lihat" on public.pilkades_pemilih
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_arsip_lihat" on public.pilkades_daftar_tetap;
create policy "pilkades_arsip_lihat" on public.pilkades_daftar_tetap
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_arsip_isi_lihat" on public.pilkades_daftar_tetap_isi;
create policy "pilkades_arsip_isi_lihat" on public.pilkades_daftar_tetap_isi
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_log_lihat" on public.pilkades_log;
create policy "pilkades_log_lihat" on public.pilkades_log
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_calon_lihat" on public.pilkades_calon;
create policy "pilkades_calon_lihat" on public.pilkades_calon
  for select to authenticated using (public.boleh_lihat_pilkades());

drop policy if exists "pilkades_hadir_lihat" on public.pilkades_hadir;
create policy "pilkades_hadir_lihat" on public.pilkades_hadir
  for select to authenticated using (public.boleh_lihat_pilkades());

-- 3. Policy TULIS: hanya panitia ---------------------------------------------------
-- TPS: pisahkan baca (admin+panitia) dan tulis (panitia).
drop policy if exists "pilkades_tps_kelola" on public.pilkades_tps;
drop policy if exists "pilkades_tps_lihat" on public.pilkades_tps;
drop policy if exists "pilkades_tps_tulis" on public.pilkades_tps;
create policy "pilkades_tps_lihat" on public.pilkades_tps
  for select to authenticated using (public.boleh_lihat_pilkades());
create policy "pilkades_tps_tulis" on public.pilkades_tps
  for all to authenticated
  using (public.boleh_kelola_pilkades()) with check (public.boleh_kelola_pilkades());

-- Verifikasi pemilih (UPDATE): hanya panitia.
drop policy if exists "pilkades_pemilih_ubah" on public.pilkades_pemilih;
create policy "pilkades_pemilih_ubah" on public.pilkades_pemilih
  for update to authenticated
  using (public.boleh_kelola_pilkades()) with check (public.boleh_kelola_pilkades());

-- Calon: tulis hanya panitia (menggantikan aturan "admin" di 0054).
drop policy if exists "pilkades_calon_tulis" on public.pilkades_calon;
create policy "pilkades_calon_tulis" on public.pilkades_calon
  for all to authenticated
  using (public.boleh_kelola_pilkades()) with check (public.boleh_kelola_pilkades());

-- Periode: tetap hanya admin (aturan 0051 tidak diubah).

-- 4. Fungsi ---------------------------------------------------------------------
-- Baca daftar pemilih (NIK samar): admin + panitia.
create or replace function public.pilkades_daftar_pemilih(p_periode uuid)
returns table (
  id uuid, warga_id uuid, nama_lengkap text, nik_samar text, jenis_kelamin text,
  tempat_lahir text, tanggal_lahir date, dusun text, rt text, rw text, alamat text,
  status_verifikasi text, tps_id uuid, catatan text
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.boleh_lihat_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  return query
  select pm.id, pm.warga_id, w.nama_lengkap,
         left(w.nik, 4) || repeat('*', greatest(length(w.nik) - 6, 0)) || right(w.nik, 2),
         w.jenis_kelamin, w.tempat_lahir, w.tanggal_lahir, w.dusun, w.rt, w.rw, w.alamat,
         pm.status_verifikasi, pm.tps_id, pm.catatan
  from public.pilkades_pemilih pm
  join public.warga w on w.id = pm.warga_id
  where pm.periode_id = p_periode
  order by w.dusun nulls last, w.nama_lengkap, pm.id;
end;
$$;

-- Catat aktivitas (juga dipakai saat admin/panitia mencetak): admin + panitia.
create or replace function public.pilkades_catat(p_periode uuid, p_aksi text, p_detail text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.boleh_lihat_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, left(p_aksi, 60), left(p_detail, 500), auth.uid(),
          (select nama from public.profiles where id = auth.uid()));
end;
$$;

-- Pembatalan hadir: sekarang hak PANITIA (alasan wajib, tercatat).
create or replace function public.pilkades_batal_hadir(p_periode uuid, p_warga uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_nama text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Hanya Panitia Pilkades yang dapat membatalkan';
  end if;
  if p_alasan is null or length(trim(p_alasan)) < 5 then
    raise exception 'Alasan wajib diisi';
  end if;

  delete from public.pilkades_hadir
  where periode_id = p_periode and warga_id = p_warga
  returning nama_lengkap into v_nama;
  if v_nama is null then
    raise exception 'Data hadir tidak ditemukan';
  end if;

  perform public.pilkades_catat(p_periode, 'batal_hadir', v_nama || ' - ' || trim(p_alasan));
end;
$$;

-- Fungsi yang MENULIS (pilkades_ambil_calon_pemilih, pilkades_tetapkan_daftar,
-- pilkades_catat_hadir) sudah memanggil boleh_kelola_pilkades(), yang kini
-- hanya meloloskan panitia. Tidak perlu didefinisikan ulang.

revoke execute on function public.pilkades_daftar_pemilih(uuid) from public, anon;
revoke execute on function public.pilkades_catat(uuid, text, text) from public, anon;
revoke execute on function public.pilkades_batal_hadir(uuid, uuid, text) from public, anon;
grant  execute on function public.pilkades_daftar_pemilih(uuid) to authenticated;
grant  execute on function public.pilkades_catat(uuid, text, text) to authenticated;
grant  execute on function public.pilkades_batal_hadir(uuid, uuid, text) to authenticated;

commit;
