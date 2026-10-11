-- 0045: Role "bpd" (Anggota Badan Permusyawaratan Desa) — pengawas, HANYA LIHAT.
--
-- Yang boleh dilihat BPD:
--   1. Pengajuan layanan & pengaduan warga + proses penanganannya, lewat VIEW
--      `pengajuan_layanan_pantau` (TANPA NIK & No. HP, nama pemohon disamarkan
--      jadi inisial). Akses langsung ke tabel pengajuan_layanan / pengajuan_surat /
--      surat_terbit DITUTUP untuk BPD, supaya NIK/No. HP tidak bisa diambil
--      dengan query langsung memakai sesi login BPD.
--   2. Data kependudukan lengkap (tombol di halaman Data Kependudukan), hanya
--      baca. Tidak ada policy tulis untuk BPD, dan BPD tidak termasuk
--      akses_penuh() / akses_tulis_penuh() / boleh_tulis_staf().
--
-- Prasyarat: migrasi 0015, 0017, 0028 sudah dijalankan.
-- Akun BPD dibuat admin lewat menu Kelola Akun Staf (role "Anggota BPD").

begin;

-- 1. Izinkan role 'bpd' di profiles ---------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'kepala_desa', 'sekretaris_desa', 'kaur', 'kasi',
                  'kadus', 'ketua_rt', 'bpd'));

-- 2. Fungsi bantu ---------------------------------------------------------
create or replace function public.adalah_bpd()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role = 'bpd' from public.profiles p where p.id = auth.uid()), false)
$$;

revoke execute on function public.adalah_bpd() from public, anon;
grant  execute on function public.adalah_bpd() to authenticated;

-- 3. Data kependudukan: BPD boleh MEMBACA se-desa (tanpa hak tulis) ---------
-- Policy bersifat menambah (OR) dari policy yang sudah ada.
drop policy if exists "warga_lihat_bpd" on public.warga;
create policy "warga_lihat_bpd"
  on public.warga for select to authenticated
  using (public.adalah_bpd());

drop policy if exists "keluarga_lihat_bpd" on public.keluarga;
create policy "keluarga_lihat_bpd"
  on public.keluarga for select to authenticated
  using (public.adalah_bpd());

-- 4. Tutup akses langsung BPD ke tabel yang memuat NIK / No. HP --------------
drop policy if exists "Staf bisa lihat semua pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa lihat semua pengajuan layanan"
  on public.pengajuan_layanan for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd());

drop policy if exists "Staf bisa lihat semua pengajuan" on public.pengajuan_surat;
create policy "Staf bisa lihat semua pengajuan"
  on public.pengajuan_surat for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd());

drop policy if exists "Staf bisa lihat surat terbit" on public.surat_terbit;
create policy "Staf bisa lihat surat terbit"
  on public.surat_terbit for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd());

-- 5. View pemantauan untuk BPD ----------------------------------------------
-- Dijalankan dengan hak pemilik view (bukan pemanggil), tetapi baris HANYA
-- keluar kalau pemanggilnya benar-benar BPD (klausa where di bawah).
-- Kolom yang sengaja TIDAK ada: nik, no_hp, warga_id, data_tambahan.
--  * pemohon_samar : inisial saja ("Budi Santoso" -> "B. S."); NULL kalau anonim.
--  * isi_pengaduan : hanya untuk kategori pengaduan; layanan lain dikosongkan
--                    karena keterangannya bisa memuat data pribadi.
--  * catatan_penanganan : catatan petugas (sama dengan yang dilihat pemohon).
create or replace view public.pengajuan_layanan_pantau
with (security_invoker = false) as
select
  p.id,
  p.kode_tracking,
  p.status,
  p.anonim,
  case
    when p.anonim then null
    else nullif(regexp_replace(coalesce(p.nama_pemohon, ''), '(\S)\S*', '\1.', 'g'), '')
  end as pemohon_samar,
  p.jenis_pengaduan,
  case when j.kategori = 'pengaduan' then p.keterangan end as isi_pengaduan,
  p.catatan_admin as catatan_penanganan,
  p.created_at,
  p.updated_at,
  j.nama_layanan,
  j.kategori,
  (select pr.nama from public.profiles pr where pr.id = p.diproses_oleh) as diproses_oleh_nama
from public.pengajuan_layanan p
left join public.jenis_layanan_master j on j.id = p.jenis_layanan_id
where public.adalah_bpd();

revoke all on public.pengajuan_layanan_pantau from public, anon;
grant select on public.pengajuan_layanan_pantau to authenticated;

commit;

-- ROLLBACK (hanya bila perlu):
--   drop view if exists public.pengajuan_layanan_pantau;
--   drop policy if exists "warga_lihat_bpd" on public.warga;
--   drop policy if exists "keluarga_lihat_bpd" on public.keluarga;
--   -- lalu kembalikan 3 policy di langkah 4 ke `using (public.adalah_staf())`
--   -- (lihat 0028), dan hapus 'bpd' dari profiles_role_check.
