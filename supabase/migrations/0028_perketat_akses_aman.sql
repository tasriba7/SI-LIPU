-- 0028: Perketat akses (AMAN dijalankan SEKARANG, SEBELUM deploy kode baru).
-- Hanya menambah tabel/fungsi baru dan mempersempit policy yang memang terlalu
-- longgar. Tidak ada yang dicabut dari alur yang sedang dipakai aplikasi.
-- Idempotent (aman dijalankan ulang). Jalankan SETELAH 0001-0027.
--
-- Isi:
--   1. Fungsi adalah_staf()  -> "pemanggil punya profil staf"
--   2. Tabel bukti_verifikasi_terpakai (dipakai kode baru, tanpa identitas)
--   3. Data pengajuan/surat/log tidak lagi terbaca sembarang akun login
--   4. Kepala Desa (hanya-lihat) tidak bisa mengubah pengajuan_layanan
--      (menyamakan database dengan migrasi 0017)
--   5. Insert publik dibatasi kolomnya (stopgap sampai 0029)

begin;

-- 1. ---------------------------------------------------------------------------
create or replace function public.adalah_staf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid())
$$;

revoke execute on function public.adalah_staf() from public, anon;
grant  execute on function public.adalah_staf() to authenticated;

-- 2. ---------------------------------------------------------------------------
-- Hanya nonce acak + waktu. TIDAK ada identitas, supaya pengaduan anonim tetap
-- tidak bisa ditautkan ke warga. RLS aktif tanpa policy = hanya service_role.
create table if not exists public.bukti_verifikasi_terpakai (
  nonce text primary key,
  kedaluwarsa_pada timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists bukti_verifikasi_terpakai_kedaluwarsa_idx
  on public.bukti_verifikasi_terpakai (kedaluwarsa_pada);
alter table public.bukti_verifikasi_terpakai enable row level security;
revoke all on table public.bukti_verifikasi_terpakai from anon, authenticated;

-- 3. ---------------------------------------------------------------------------
-- Sebelumnya `using (true)`: akun login APA PUN (mis. hasil sign-up sendiri)
-- bisa membaca NIK & No. HP semua pengajuan. Sekarang harus punya profil staf.
drop policy if exists "Staf bisa lihat semua pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa lihat semua pengajuan layanan"
  on public.pengajuan_layanan for select to authenticated
  using (public.adalah_staf());

drop policy if exists "Staf bisa lihat semua pengajuan" on public.pengajuan_surat;
create policy "Staf bisa lihat semua pengajuan"
  on public.pengajuan_surat for select to authenticated
  using (public.adalah_staf());

drop policy if exists "Staf bisa lihat surat terbit" on public.surat_terbit;
create policy "Staf bisa lihat surat terbit"
  on public.surat_terbit for select to authenticated
  using (public.adalah_staf());

drop policy if exists "Staf bisa lihat posisi perangkat" on public.posisi_perangkat;
create policy "Staf bisa lihat posisi perangkat"
  on public.posisi_perangkat for select to authenticated
  using (public.adalah_staf());

-- Log berisi NIK lengkap yang dicoba warga: hanya admin (sebelumnya semua staf,
-- sehingga Kadus/Ketua RT bisa melihat NIK di luar wilayahnya).
drop policy if exists "Staf bisa baca log pencarian" on public.log_pencarian_warga;
drop policy if exists "Admin bisa baca log pencarian" on public.log_pencarian_warga;
create policy "Admin bisa baca log pencarian"
  on public.log_pencarian_warga for select to authenticated
  using (public.adalah_admin());

-- 4. ---------------------------------------------------------------------------
drop policy if exists "Staf bisa update pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa update pengajuan layanan"
  on public.pengajuan_layanan for update to authenticated
  using (public.boleh_tulis_staf())
  with check (public.boleh_tulis_staf());

-- 5. ---------------------------------------------------------------------------
-- Insert dari publik (anon) tidak boleh menyetel kolom milik staf (status,
-- catatan_admin, diproses_oleh) dan ukurannya dibatasi. Policy ini hanya
-- penyangga: 0029 akan menutup insert langsung sepenuhnya.
--
-- pengajuan_layanan: staf yang login (mis. "Buat Surat Langsung", status
-- 'diproses') punya policy sendiri, jadi alur itu TIDAK terganggu.
drop policy if exists "Warga bisa ajukan layanan baru" on public.pengajuan_layanan;
drop policy if exists "Publik bisa ajukan layanan (terbatas)" on public.pengajuan_layanan;
create policy "Publik bisa ajukan layanan (terbatas)"
  on public.pengajuan_layanan for insert to anon
  with check (
    status = 'diajukan'
    and catatan_admin is null
    and diproses_oleh is null
    and octet_length(data_tambahan::text) <= 20000
    and coalesce(length(keterangan), 0) <= 5000
  );

drop policy if exists "Staf bisa membuat pengajuan layanan" on public.pengajuan_layanan;
create policy "Staf bisa membuat pengajuan layanan"
  on public.pengajuan_layanan for insert to authenticated
  with check (public.boleh_tulis_staf());

drop policy if exists "Warga bisa ajukan surat baru" on public.pengajuan_surat;
drop policy if exists "Publik bisa ajukan surat (terbatas)" on public.pengajuan_surat;
create policy "Publik bisa ajukan surat (terbatas)"
  on public.pengajuan_surat for insert to anon, authenticated
  with check (
    status = 'diajukan'
    and catatan_admin is null
    and diproses_oleh is null
  );

drop policy if exists "Publik bisa daftar posisi" on public.pendaftaran_akun;
drop policy if exists "Publik bisa daftar posisi (terbatas)" on public.pendaftaran_akun;
create policy "Publik bisa daftar posisi (terbatas)"
  on public.pendaftaran_akun for insert to anon, authenticated
  with check (
    status = 'pending'
    and catatan_admin is null
    and diproses_oleh is null
    and tanggal_diproses is null
  );

commit;
