-- 0054: Pilkades tahap 3 - Calon Kepala Desa + Daftar Hadir pemilih di TPS.
-- Idempotent. Prasyarat: 0051 dan 0052 sudah dijalankan.
--
-- PRINSIP:
--  * Calon: hanya admin yang mengubah; panitia hanya membaca.
--  * Daftar hadir mengacu ke DPT RESMI (versi tertinggi di arsip 0052), bukan
--    ke data pemilih yang masih bisa berubah. Tanpa DPT, tidak ada yang bisa dicatat hadir.
--  * Satu pemilih hanya bisa dicatat hadir SEKALI per periode (unique).
--  * Tabel hadir hanya SELECT lewat API; tulis hanya lewat fungsi. Pembatalan
--    wajib alasan dan hanya admin, dan keduanya tercatat di Riwayat.
--  * TIDAK ada penyimpanan pilihan/suara pemilih (pemungutan suara rahasia).
--
-- ROLLBACK: drop table pilkades_hadir, pilkades_calon cascade;
--           drop function pilkades_catat_hadir, pilkades_batal_hadir;

begin;

-- 1. Calon -----------------------------------------------------------------
create table if not exists public.pilkades_calon (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  nomor_urut integer check (nomor_urut > 0),
  nama text not null,
  warga_id uuid references public.warga(id) on delete set null,
  status text not null default 'mendaftar'
    check (status in ('mendaftar', 'lolos_verifikasi', 'tidak_lolos', 'ditetapkan')),
  alasan text,
  visi_misi text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (periode_id, nomor_urut)
);

-- 2. Daftar hadir ----------------------------------------------------------
create table if not exists public.pilkades_hadir (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  warga_id uuid not null,
  nama_lengkap text not null,
  tps_nama text,
  hadir_pada timestamptz not null default now(),
  dicatat_oleh uuid references public.profiles(id) on delete set null,
  dicatat_oleh_nama text,
  unique (periode_id, warga_id)
);
create index if not exists pilkades_hadir_periode_idx on public.pilkades_hadir (periode_id, tps_nama);

-- 3. Hak akses ---------------------------------------------------------------
revoke all on public.pilkades_calon, public.pilkades_hadir from public, anon, authenticated;
grant select, insert, update, delete on public.pilkades_calon to authenticated;
grant select on public.pilkades_hadir to authenticated;

alter table public.pilkades_calon enable row level security;
alter table public.pilkades_hadir enable row level security;

drop policy if exists "pilkades_calon_lihat" on public.pilkades_calon;
create policy "pilkades_calon_lihat" on public.pilkades_calon
  for select to authenticated using (public.boleh_kelola_pilkades());
drop policy if exists "pilkades_calon_tulis" on public.pilkades_calon;
create policy "pilkades_calon_tulis" on public.pilkades_calon
  for all to authenticated
  using (public.adalah_admin()) with check (public.adalah_admin());

drop policy if exists "pilkades_hadir_lihat" on public.pilkades_hadir;
create policy "pilkades_hadir_lihat" on public.pilkades_hadir
  for select to authenticated using (public.boleh_kelola_pilkades());

-- 4. Catat hadir (berdasarkan DPT resmi) ------------------------------------
create or replace function public.pilkades_catat_hadir(p_periode uuid, p_warga uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_daftar uuid;
  v_isi public.pilkades_daftar_tetap_isi%rowtype;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;

  select id into v_daftar from public.pilkades_daftar_tetap
  where periode_id = p_periode and jenis = 'DPT'
  order by versi desc limit 1;
  if v_daftar is null then
    raise exception 'DPT belum ditetapkan';
  end if;

  select * into v_isi from public.pilkades_daftar_tetap_isi
  where daftar_id = v_daftar and warga_id = p_warga;
  if not found then
    raise exception 'Pemilih tidak ada di DPT';
  end if;

  begin
    insert into public.pilkades_hadir
      (periode_id, warga_id, nama_lengkap, tps_nama, dicatat_oleh, dicatat_oleh_nama)
    values
      (p_periode, p_warga, v_isi.nama_lengkap, v_isi.tps_nama, auth.uid(),
       (select nama from public.profiles where id = auth.uid()));
  exception when unique_violation then
    raise exception 'Pemilih sudah tercatat hadir';
  end;
end;
$$;

-- 5. Batalkan hadir (khusus admin, wajib alasan, tercatat di riwayat) ---------
create or replace function public.pilkades_batal_hadir(p_periode uuid, p_warga uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_nama text;
begin
  if not public.adalah_admin() then
    raise exception 'Hanya administrator yang dapat membatalkan';
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

revoke execute on function public.pilkades_catat_hadir(uuid, uuid)        from public, anon;
revoke execute on function public.pilkades_batal_hadir(uuid, uuid, text)  from public, anon;
grant  execute on function public.pilkades_catat_hadir(uuid, uuid)        to authenticated;
grant  execute on function public.pilkades_batal_hadir(uuid, uuid, text)  to authenticated;

commit;
