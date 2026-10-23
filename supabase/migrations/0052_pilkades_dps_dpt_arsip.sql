-- 0052: Pilkades tahap 2 - arsip DPS/DPT (salinan tetap) + riwayat aktivitas.
-- Idempotent. Prasyarat: 0051 sudah dijalankan.
--
-- PRINSIP:
--  * Saat DPS/DPT ditetapkan, isi daftar DISALIN (snapshot) ke
--    pilkades_daftar_tetap_isi. Perubahan data warga/verifikasi sesudahnya
--    TIDAK mengubah daftar yang sudah ditetapkan.
--  * Snapshot hanya menyimpan NIK SAMAR, bukan NIK lengkap.
--  * Tabel arsip dan log TIDAK bisa diubah/dihapus lewat API (hanya SELECT);
--    penulisan hanya lewat fungsi di bawah. Koreksi = tetapkan VERSI BARU.
--  * Versi tertinggi tiap jenis (DPS / DPT) = yang berlaku.
--
-- ROLLBACK: drop table pilkades_log, pilkades_daftar_tetap_isi, pilkades_daftar_tetap cascade;
--           drop function pilkades_tetapkan_daftar, pilkades_catat.

begin;

-- 1. Tabel ---------------------------------------------------------------
create table if not exists public.pilkades_daftar_tetap (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete restrict,
  jenis text not null check (jenis in ('DPS', 'DPT')),
  versi integer not null,
  tanggal_penetapan date not null,
  nomor_berita_acara text,
  catatan text,
  jumlah integer not null,
  ditetapkan_oleh uuid references public.profiles(id) on delete set null,
  ditetapkan_oleh_nama text,
  created_at timestamptz not null default now(),
  unique (periode_id, jenis, versi)
);

create table if not exists public.pilkades_daftar_tetap_isi (
  id uuid primary key default gen_random_uuid(),
  daftar_id uuid not null references public.pilkades_daftar_tetap(id) on delete cascade,
  urut integer not null,
  warga_id uuid,
  nama_lengkap text not null,
  nik_samar text,
  jenis_kelamin text,
  tempat_lahir text,
  tanggal_lahir date,
  dusun text,
  rt text,
  rw text,
  alamat text,
  tps_nama text
);
create index if not exists pilkades_isi_daftar_idx
  on public.pilkades_daftar_tetap_isi (daftar_id, urut);

create table if not exists public.pilkades_log (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid references public.pilkades_periode(id) on delete set null,
  aksi text not null,
  detail text,
  oleh uuid references public.profiles(id) on delete set null,
  oleh_nama text,
  created_at timestamptz not null default now()
);
create index if not exists pilkades_log_waktu_idx on public.pilkades_log (created_at desc);

-- 2. Hak akses: hanya SELECT untuk authenticated; anon tidak punya apa pun -----
revoke all on public.pilkades_daftar_tetap, public.pilkades_daftar_tetap_isi, public.pilkades_log
  from public, anon, authenticated;
grant select on public.pilkades_daftar_tetap, public.pilkades_daftar_tetap_isi, public.pilkades_log
  to authenticated;

alter table public.pilkades_daftar_tetap     enable row level security;
alter table public.pilkades_daftar_tetap_isi enable row level security;
alter table public.pilkades_log              enable row level security;

drop policy if exists "pilkades_arsip_lihat" on public.pilkades_daftar_tetap;
create policy "pilkades_arsip_lihat" on public.pilkades_daftar_tetap
  for select to authenticated using (public.boleh_kelola_pilkades());
drop policy if exists "pilkades_arsip_isi_lihat" on public.pilkades_daftar_tetap_isi;
create policy "pilkades_arsip_isi_lihat" on public.pilkades_daftar_tetap_isi
  for select to authenticated using (public.boleh_kelola_pilkades());
drop policy if exists "pilkades_log_lihat" on public.pilkades_log;
create policy "pilkades_log_lihat" on public.pilkades_log
  for select to authenticated using (public.boleh_kelola_pilkades());

-- 3. Catat aktivitas -------------------------------------------------------
create or replace function public.pilkades_catat(p_periode uuid, p_aksi text, p_detail text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, left(p_aksi, 60), left(p_detail, 500), auth.uid(),
          (select nama from public.profiles where id = auth.uid()));
end;
$$;

-- 4. Tetapkan DPS / DPT (salin daftar pemilih yang "memenuhi syarat") ---------
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

-- 5. Urutan stabil untuk paginasi + catat pengambilan calon pemilih ------------
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
  order by w.dusun nulls last, w.nama_lengkap, pm.id;
end;
$$;

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
  insert into public.pilkades_log (periode_id, aksi, detail, oleh, oleh_nama)
  values (p_periode, 'ambil_calon_pemilih', v_jumlah || ' calon pemilih baru ditambahkan',
          auth.uid(), (select nama from public.profiles where id = auth.uid()));
  return v_jumlah;
end;
$$;

revoke execute on function public.pilkades_catat(uuid, text, text)                       from public, anon;
revoke execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) from public, anon;
revoke execute on function public.pilkades_daftar_pemilih(uuid)                          from public, anon;
revoke execute on function public.pilkades_ambil_calon_pemilih(uuid)                     from public, anon;
grant  execute on function public.pilkades_catat(uuid, text, text)                       to authenticated;
grant  execute on function public.pilkades_tetapkan_daftar(uuid, text, date, text, text) to authenticated;
grant  execute on function public.pilkades_daftar_pemilih(uuid)                          to authenticated;
grant  execute on function public.pilkades_ambil_calon_pemilih(uuid)                     to authenticated;

commit;
