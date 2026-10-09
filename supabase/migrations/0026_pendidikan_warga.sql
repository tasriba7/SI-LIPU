-- 0026: Kolom pendidikan terakhir warga + dukungan halaman "Detail Keluarga".
-- Jalankan SETELAH 0001-0025 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent). Tidak mengubah/menghapus data yang sudah ada.
--
-- 1. Tambah kolom `pendidikan` (teks bebas dari dropdown, boleh kosong).
-- 2. View `warga_kelengkapan` diperbarui agar ikut membawa kolom `pendidikan`
--    (halaman Edit Warga membaca dari view ini). Kolom baru HANYA ditaruh di
--    paling akhir (syarat `create or replace view`), dan SENGAJA tidak ikut
--    dihitung di `kolom_kosong` supaya ribuan data lama tidak mendadak
--    berstatus "Kurang 1".

alter table public.warga add column if not exists pendidikan text;

create index if not exists warga_no_kk_idx on public.warga (no_kk);

create or replace view public.warga_kelengkapan
with (security_invoker = true) as
select
  w.id, w.nik, w.no_kk, w.nama_lengkap, w.tempat_lahir, w.tanggal_lahir,
  w.jenis_kelamin, w.alamat, w.dusun, w.rt, w.rw, w.no_hp, w.status_kawin,
  w.status_dalam_kk, w.pekerjaan, w.agama, w.created_at, w.updated_at,
  w.dibuat_oleh, w.dibuat_oleh_nama, coalesce(public.role_terkini(w.dibuat_oleh), w.dibuat_oleh_role) as dibuat_oleh_role, w.dibuat_oleh_wilayah,
  w.diubah_oleh, w.diubah_oleh_nama,
  k.kolom_kosong,
  cardinality(k.kolom_kosong) as jumlah_kosong,
  w.pendidikan
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
