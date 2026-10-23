-- 0051: Fitur Pilkades tahap 1 (role panitia, periode, TPS, pemilih).
-- Idempotent. Prasyarat: migrasi 0017, 0045 sudah dijalankan.
--
-- PRINSIP:
--  * TIDAK ada tabel induk penduduk baru. pilkades_pemilih hanya menyimpan
--    warga_id (rujukan ke public.warga) + status khusus Pilkades.
--  * Role baru 'panitia_pilkades' TIDAK diberi akses ke tabel warga/keluarga.
--    Panitia hanya membaca lewat fungsi pilkades_daftar_pemilih() yang
--    mengembalikan kolom terbatas (tanpa no_hp, tanpa data pembuat).
--  * anon tidak punya hak apa pun di tabel pilkades_*.
--  * Kelayakan pemilih (umur, status, dll) TIDAK ditentukan otomatis; panitia
--    menandai sendiri sesuai aturan Pilkades daerah.
--
-- ROLLBACK: drop table pilkades_pemilih, pilkades_tps, pilkades_periode cascade;
--           drop function pilkades_*; ubah kembali profiles_role_check.

begin;

-- 1. Role baru -------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'kepala_desa', 'sekretaris_desa', 'kaur', 'kasi',
                  'kadus', 'ketua_rt', 'bpd', 'panitia_pilkades'));

create or replace function public.adalah_panitia_pilkades()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.role = 'panitia_pilkades'
                   from public.profiles p where p.id = auth.uid()), false)
$$;

-- admin ATAU panitia
create or replace function public.boleh_kelola_pilkades()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.role in ('admin', 'panitia_pilkades')
                   from public.profiles p where p.id = auth.uid()), false)
$$;

revoke execute on function public.adalah_panitia_pilkades() from public, anon;
revoke execute on function public.boleh_kelola_pilkades()   from public, anon;
grant  execute on function public.adalah_panitia_pilkades() to authenticated;
grant  execute on function public.boleh_kelola_pilkades()   to authenticated;

-- 2. Tabel -----------------------------------------------------------------
create table if not exists public.pilkades_periode (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tanggal_pemungutan date,
  aktif boolean not null default false,
  catatan text,
  dibuat_oleh uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
-- hanya satu periode aktif pada satu waktu
create unique index if not exists pilkades_periode_satu_aktif
  on public.pilkades_periode (aktif) where aktif;

create table if not exists public.pilkades_tps (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  nama text not null,
  lokasi text,
  created_at timestamptz not null default now(),
  unique (periode_id, nama)
);

create table if not exists public.pilkades_pemilih (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  warga_id uuid not null references public.warga(id) on delete restrict,
  status_verifikasi text not null default 'belum'
    check (status_verifikasi in ('belum', 'memenuhi_syarat', 'tidak_memenuhi', 'perlu_dicek')),
  tps_id uuid references public.pilkades_tps(id) on delete set null,
  catatan text,
  diverifikasi_oleh uuid references public.profiles(id) on delete set null,
  diverifikasi_pada timestamptz,
  created_at timestamptz not null default now(),
  unique (periode_id, warga_id)
);
create index if not exists pilkades_pemilih_periode_idx on public.pilkades_pemilih (periode_id);
create index if not exists pilkades_pemilih_tps_idx on public.pilkades_pemilih (tps_id);

-- 3. Hak akses: tutup anon, buka seperlunya untuk authenticated ---------------
revoke all on public.pilkades_periode, public.pilkades_tps, public.pilkades_pemilih
  from public, anon;
grant select, insert, update, delete on public.pilkades_periode to authenticated;
grant select, insert, update, delete on public.pilkades_tps     to authenticated;
grant select, update                 on public.pilkades_pemilih to authenticated;
-- (INSERT pemilih hanya lewat fungsi pilkades_ambil_calon_pemilih)

alter table public.pilkades_periode enable row level security;
alter table public.pilkades_tps     enable row level security;
alter table public.pilkades_pemilih enable row level security;

-- Periode: admin & panitia membaca; hanya admin menulis.
drop policy if exists "pilkades_periode_lihat" on public.pilkades_periode;
create policy "pilkades_periode_lihat" on public.pilkades_periode
  for select to authenticated using (public.boleh_kelola_pilkades());
drop policy if exists "pilkades_periode_tulis" on public.pilkades_periode;
create policy "pilkades_periode_tulis" on public.pilkades_periode
  for all to authenticated
  using (public.adalah_admin()) with check (public.adalah_admin());

-- TPS & pemilih: admin & panitia.
drop policy if exists "pilkades_tps_kelola" on public.pilkades_tps;
create policy "pilkades_tps_kelola" on public.pilkades_tps
  for all to authenticated
  using (public.boleh_kelola_pilkades()) with check (public.boleh_kelola_pilkades());

drop policy if exists "pilkades_pemilih_lihat" on public.pilkades_pemilih;
create policy "pilkades_pemilih_lihat" on public.pilkades_pemilih
  for select to authenticated using (public.boleh_kelola_pilkades());
drop policy if exists "pilkades_pemilih_ubah" on public.pilkades_pemilih;
create policy "pilkades_pemilih_ubah" on public.pilkades_pemilih
  for update to authenticated
  using (public.boleh_kelola_pilkades()) with check (public.boleh_kelola_pilkades());

-- 4. Fungsi: ambil calon pemilih dari warga (hanya yang berstatus aktif) -------
create or replace function public.pilkades_ambil_calon_pemilih(p_periode uuid)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare v_jumlah integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  insert into public.pilkades_pemilih (periode_id, warga_id)
  select p_periode, w.id
  from public.warga w
  where w.status_kependudukan = 'aktif'
  on conflict (periode_id, warga_id) do nothing;
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- 5. Fungsi: daftar pemilih dengan kolom TERBATAS -----------------------------
-- NIK dikembalikan dalam bentuk samar. TANPA no_hp, alamat lengkap pembuat, dll.
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
  if not public.boleh_kelola_pilkades() then
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
  order by w.dusun nulls last, w.nama_lengkap;
end;
$$;

revoke execute on function public.pilkades_ambil_calon_pemilih(uuid) from public, anon;
revoke execute on function public.pilkades_daftar_pemilih(uuid)      from public, anon;
grant  execute on function public.pilkades_ambil_calon_pemilih(uuid) to authenticated;
grant  execute on function public.pilkades_daftar_pemilih(uuid)      to authenticated;

commit;
