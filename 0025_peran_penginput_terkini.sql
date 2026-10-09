-- 0025: Peran penginput di tampilan ikut peran akun SAAT INI.
-- Jalankan SETELAH 0001-0024 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent).
--
-- MASALAH
--   Kolom warga.dibuat_oleh_role adalah SALINAN peran pada saat data diinput
--   (sengaja, supaya jejak tetap ada walau akun dihapus). Akibatnya, akun yang
--   dulu "kepala_desa" lalu diubah jadi "admin" (migrasi 0017) tetap tertulis
--   "kepala_desa" di dashboard dan daftar kependudukan.
--
-- PERBAIKAN
--   View membaca peran TERKINI dari profiles; kalau akunnya sudah dihapus,
--   baru memakai salinan lama. Tidak ada data warga yang diubah.

create or replace function public.role_terkini(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = p_id
$$;

create or replace view public.warga_kelengkapan
with (security_invoker = true) as
select
  w.id, w.nik, w.no_kk, w.nama_lengkap, w.tempat_lahir, w.tanggal_lahir,
  w.jenis_kelamin, w.alamat, w.dusun, w.rt, w.rw, w.no_hp, w.status_kawin,
  w.status_dalam_kk, w.pekerjaan, w.agama, w.created_at, w.updated_at,
  w.dibuat_oleh, w.dibuat_oleh_nama, coalesce(public.role_terkini(w.dibuat_oleh), w.dibuat_oleh_role) as dibuat_oleh_role, w.dibuat_oleh_wilayah,
  w.diubah_oleh, w.diubah_oleh_nama,
  k.kolom_kosong,
  cardinality(k.kolom_kosong) as jumlah_kosong
from public.warga w
cross join lateral (
  select array_remove(array[
    case when coalesce(btrim(w.no_kk), '')           = '' then 'no_kk' end,
    case when coalesce(btrim(w.tempat_lahir), '')    = '' then 'tempat_lahir' end,
    case when coalesce(btrim(w.jenis_kelamin), '')   = '' then 'jenis_kelamin' end,
    case when coalesce(btrim(w.status_kawin), '')    = '' then 'status_kawin' end,
    case when coalesce(btrim(w.status_dalam_kk), '') = '' then 'status_dalam_kk' end,
    case when coalesce(btrim(w.agama), '')           = '' then 'agama' end,
    case when coalesce(btrim(w.pekerjaan), '')       = '' then 'pekerjaan' end,
    case when coalesce(btrim(w.alamat), '')          = '' then 'alamat' end,
    case when coalesce(btrim(w.dusun), '')           = '' then 'dusun' end,
    case when coalesce(btrim(w.rt), '')              = '' then 'rt' end,
    case when coalesce(btrim(w.rw), '')              = '' then 'rw' end
  ], null) as kolom_kosong
) k;
