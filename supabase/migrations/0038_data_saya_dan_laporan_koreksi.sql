-- Fitur "Data Saya" di Panel Warga + "Laporan Data Keliru" ke admin.
-- Jalankan SETELAH 0037.
--
-- Warga memasukkan NIK + tanggal lahir (dua faktor), lalu melihat data
-- kependudukannya sendiri. Kalau ada yang keliru/kurang, warga mengirim pesan
-- singkat ke admin lewat form di halaman yang sama.
--
-- PENGECUALIAN dari docs/SECURITY.md poin 1.4 & 1.6 (sengaja, atas permintaan
-- pemilik proyek; dicatat juga di SECURITY.md):
--   * data lengkap milik warga itu sendiri dikembalikan SETELAH dua faktor cocok,
--     tanpa langkah "Apakah ini Anda?" (warga hanya melihat datanya SENDIRI).
-- Aturan lain TETAP berlaku:
--   * NIK + tanggal lahir harus cocok BERSAMAAN; salah satu salah = hasil kosong
--     yang SAMA dengan keduanya salah (tidak ada petunjuk);
--   * setiap percobaan dicatat di log_pencarian_warga (dasar rate limit
--     5 gagal / 15 menit, dicek di server action);
--   * hanya penduduk berstatus 'aktif' yang bisa dilihat (yang sudah meninggal
--     atau pindah tidak dikembalikan);
--   * TIDAK ada data anggota keluarga lain, hanya diri sendiri;
--   * fungsi hanya bisa dijalankan service_role (pola migrasi 0029/0037).

-- 1. Kotak masuk laporan data keliru -----------------------------------------
create table if not exists public.laporan_data_warga (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  warga_id uuid not null references public.warga (id) on delete cascade,
  bagian_data text,
  pesan text not null,
  no_hp_kontak text,
  status text not null default 'baru',
  catatan_admin text,
  ditangani_oleh uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laporan_data_warga_status_check
    check (status in ('baru', 'diproses', 'selesai', 'ditolak')),
  constraint laporan_data_warga_pesan_panjang
    check (char_length(pesan) between 10 and 1000),
  constraint laporan_data_warga_bagian_panjang
    check (bagian_data is null or char_length(bagian_data) <= 60),
  constraint laporan_data_warga_hp_panjang
    check (no_hp_kontak is null or char_length(no_hp_kontak) <= 20),
  constraint laporan_data_warga_catatan_panjang
    check (catatan_admin is null or char_length(catatan_admin) <= 500)
);

create index if not exists laporan_data_warga_status_idx
  on public.laporan_data_warga (status, created_at desc);
create index if not exists laporan_data_warga_warga_idx
  on public.laporan_data_warga (warga_id, created_at desc);

drop trigger if exists set_laporan_data_warga_updated_at on public.laporan_data_warga;
create trigger set_laporan_data_warga_updated_at
  before update on public.laporan_data_warga
  for each row execute procedure public.set_updated_at();

alter table public.laporan_data_warga enable row level security;

-- Hanya Administrator yang mengelola laporan. Warga (anon) tidak punya akses
-- langsung sama sekali; mengirim laporan hanya lewat fungsi di bawah.
drop policy if exists "Admin kelola laporan data warga" on public.laporan_data_warga;
create policy "Admin kelola laporan data warga"
  on public.laporan_data_warga for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

revoke all on table public.laporan_data_warga from anon;

-- 2. Warga melihat data dirinya sendiri --------------------------------------
create or replace function public.data_warga_publik(
  p_nik text,
  p_tanggal_lahir date,
  p_identifier text
)
returns table (
  nama_lengkap text,
  nik text,
  no_kk text,
  tempat_lahir text,
  tanggal_lahir date,
  jenis_kelamin text,
  alamat text,
  dusun text,
  rt text,
  rw text,
  status_kawin text,
  pekerjaan text,
  agama text,
  pendidikan text,
  no_hp text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ada boolean;
begin
  select exists (
    select 1 from public.warga w
    where w.nik = p_nik
      and w.tanggal_lahir = p_tanggal_lahir
      and w.status_kependudukan = 'aktif'
  ) into v_ada;

  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_ada);

  if not v_ada then
    return;
  end if;

  return query
  select w.nama_lengkap, w.nik, w.no_kk, w.tempat_lahir, w.tanggal_lahir,
         w.jenis_kelamin, w.alamat, w.dusun, w.rt, w.rw, w.status_kawin,
         w.pekerjaan, w.agama, w.pendidikan, w.no_hp
  from public.warga w
  where w.nik = p_nik
    and w.tanggal_lahir = p_tanggal_lahir
    and w.status_kependudukan = 'aktif'
  limit 1;
end;
$$;

-- 3. Warga mengirim laporan ke admin -----------------------------------------
-- Dua faktor diperiksa ULANG di sini (bukan percaya halaman sebelumnya), jadi
-- laporan tidak bisa dikirim atas nama NIK orang lain.
-- Hasil: kode laporan | 'BATAS' (terlalu banyak laporan baru) | null (tidak cocok).
create or replace function public.kirim_laporan_data_warga(
  p_nik text,
  p_tanggal_lahir date,
  p_bagian text,
  p_pesan text,
  p_no_hp text,
  p_identifier text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warga_id uuid;
  v_baru int;
  v_kode text;
begin
  select w.id into v_warga_id
  from public.warga w
  where w.nik = p_nik
    and w.tanggal_lahir = p_tanggal_lahir
    and w.status_kependudukan = 'aktif';

  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_warga_id is not null);

  if v_warga_id is null then
    return null;
  end if;

  -- Cegah spam: maksimal 3 laporan yang masih berstatus 'baru' per penduduk.
  select count(*) into v_baru
  from public.laporan_data_warga
  where warga_id = v_warga_id and status = 'baru';

  if v_baru >= 3 then
    return 'BATAS';
  end if;

  -- gen_random_uuid() bawaan Postgres (gen_random_bytes ada di schema extensions
  -- pada Supabase dan tidak ikut search_path = public).
  v_kode := 'LDW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.laporan_data_warga (kode, warga_id, bagian_data, pesan, no_hp_kontak)
  values (v_kode, v_warga_id, nullif(trim(p_bagian), ''), trim(p_pesan), nullif(trim(p_no_hp), ''));

  return v_kode;
end;
$$;

revoke execute on function public.data_warga_publik(text, date, text) from public, anon, authenticated;
revoke execute on function public.kirim_laporan_data_warga(text, date, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.data_warga_publik(text, date, text) to service_role;
grant  execute on function public.kirim_laporan_data_warga(text, date, text, text, text, text) to service_role;
