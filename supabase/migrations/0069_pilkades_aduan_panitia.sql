-- 0069: Aduan warga bertema Pilkades untuk Panitia Pilkades (HANYA LIHAT).
-- Idempotent. Prasyarat: 0017, 0045, 0051, 0055 sudah dijalankan.
--
-- ISI
--  1. MENUTUP CELAH: policy baca pengajuan_layanan / pengajuan_surat / surat_terbit memakai
--     adalah_staf() = "punya profil apa saja", sehingga akun Panitia Pilkades (punya profil) bisa
--     membaca NIK & No. HP warga lewat API Supabase walau menunya disembunyikan. Panitia kini
--     dikeluarkan dari policy itu, sama seperti BPD (0045).
--  2. View pilkades_aduan_pantau: hanya pengaduan berjenis "Pilkades: ...". Tanpa NIK/No. HP,
--     nama disamarkan jadi inisial, anonim tetap tanpa identitas.
--       - Panitia: semua aduan Pilkades KECUALI yang mengadukan panitia itu sendiri
--         (ketidaknetralan perangkat desa/panitia, kinerja panitia) -> benturan kepentingan.
--       - Administrator: semua aduan Pilkades.
--
-- ROLLBACK:
--   drop view if exists public.pilkades_aduan_pantau;
--   lalu kembalikan 3 policy di langkah 1 ke versi 0045 (`adalah_staf() and not adalah_bpd()`).

begin;

-- 1. Tutup akses langsung panitia ke tabel yang memuat NIK / No. HP ------------------------
drop policy if exists "Staf bisa lihat semua pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa lihat semua pengajuan layanan"
  on public.pengajuan_layanan for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd() and not public.adalah_panitia_pilkades());

drop policy if exists "Staf bisa lihat semua pengajuan" on public.pengajuan_surat;
create policy "Staf bisa lihat semua pengajuan"
  on public.pengajuan_surat for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd() and not public.adalah_panitia_pilkades());

drop policy if exists "Staf bisa lihat surat terbit" on public.surat_terbit;
create policy "Staf bisa lihat surat terbit"
  on public.surat_terbit for select to authenticated
  using (public.adalah_staf() and not public.adalah_bpd() and not public.adalah_panitia_pilkades());

-- 2. View aduan Pilkades ----------------------------------------------------------------------
-- Dijalankan dengan hak pemilik view, tetapi baris HANYA keluar untuk admin/panitia (klausa where).
-- Kolom yang sengaja TIDAK ada: nik, no_hp, warga_id, data_tambahan.
create or replace view public.pilkades_aduan_pantau
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
  p.keterangan as isi_pengaduan,
  p.catatan_admin as catatan_penanganan,
  p.created_at,
  p.updated_at,
  j.nama_layanan,
  j.kategori,
  (select pr.nama from public.profiles pr where pr.id = p.diproses_oleh) as diproses_oleh_nama
from public.pengajuan_layanan p
join public.jenis_layanan_master j on j.id = p.jenis_layanan_id
where j.kategori = 'pengaduan'
  and p.jenis_pengaduan like 'Pilkades:%'
  and (
    public.adalah_admin()
    or (
      public.adalah_panitia_pilkades()
      -- aduan tentang panitia sendiri tidak ditampilkan ke panitia (benturan kepentingan)
      and p.jenis_pengaduan not like 'Pilkades: dugaan ketidaknetralan%'
      and p.jenis_pengaduan not like 'Pilkades: pelayanan atau kinerja panitia%'
    )
  );

revoke all on public.pilkades_aduan_pantau from public, anon;
grant select on public.pilkades_aduan_pantau to authenticated;

commit;
