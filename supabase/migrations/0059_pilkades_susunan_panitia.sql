-- 0059: Pilkades - Susunan Panitia (Ketua, Sekretaris, Bendahara, Anggota).
-- Idempotent. Prasyarat: 0051, 0052, 0055 sudah dijalankan.
--
-- PRINSIP:
--  * Login tetap SATU akun panitia. Susunan panitia hanyalah DATA (nama + jabatan)
--    per periode, dipakai untuk blok tanda tangan di dokumen cetak.
--  * Ketua, Sekretaris, Bendahara: masing-masing maksimal SATU orang per periode.
--    Anggota: boleh banyak.
--  * Baca: admin + panitia. Tulis: HANYA panitia, dan hanya lewat fungsi di bawah
--    (tidak ada INSERT/UPDATE/DELETE langsung dari API), supaya selalu tercatat di Riwayat.
--
-- ROLLBACK: drop table public.pilkades_panitia;
--           drop function public.pilkades_simpan_panitia(uuid, text, text);
--           drop function public.pilkades_hapus_panitia(uuid);

begin;

-- 1. Tabel ------------------------------------------------------------------
create table if not exists public.pilkades_panitia (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  jabatan text not null
    check (jabatan in ('ketua', 'sekretaris', 'bendahara', 'anggota')),
  nama text not null check (length(trim(nama)) between 3 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ketua/Sekretaris/Bendahara: satu orang per periode. Anggota dikecualikan.
create unique index if not exists pilkades_panitia_satu_jabatan
  on public.pilkades_panitia (periode_id, jabatan)
  where jabatan <> 'anggota';

create index if not exists pilkades_panitia_periode_idx
  on public.pilkades_panitia (periode_id);

-- 2. Hak akses ----------------------------------------------------------------
revoke all on public.pilkades_panitia from public, anon, authenticated;
grant select on public.pilkades_panitia to authenticated;

alter table public.pilkades_panitia enable row level security;

drop policy if exists "pilkades_panitia_lihat" on public.pilkades_panitia;
create policy "pilkades_panitia_lihat" on public.pilkades_panitia
  for select to authenticated using (public.boleh_lihat_pilkades());

-- 3. Simpan / ganti pengurus -----------------------------------------------------
-- Ketua/Sekretaris/Bendahara: kalau sudah ada, namanya DIGANTI. Anggota: ditambah.
create or replace function public.pilkades_simpan_panitia(
  p_periode uuid, p_jabatan text, p_nama text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_nama text := trim(coalesce(p_nama, ''));
  v_lama text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_jabatan not in ('ketua', 'sekretaris', 'bendahara', 'anggota') then
    raise exception 'Jabatan tidak valid.';
  end if;
  if length(v_nama) < 3 or length(v_nama) > 100 then
    raise exception 'Nama harus 3 sampai 100 huruf.';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan.';
  end if;

  if p_jabatan = 'anggota' then
    if exists (
      select 1 from public.pilkades_panitia
      where periode_id = p_periode and jabatan = 'anggota'
        and lower(nama) = lower(v_nama)
    ) then
      raise exception 'Nama anggota itu sudah ada.';
    end if;
    insert into public.pilkades_panitia (periode_id, jabatan, nama, created_by)
    values (p_periode, 'anggota', v_nama, auth.uid());
    perform public.pilkades_catat(p_periode, 'ubah_panitia', 'Tambah anggota: ' || v_nama);
  else
    select nama into v_lama from public.pilkades_panitia
    where periode_id = p_periode and jabatan = p_jabatan;

    insert into public.pilkades_panitia (periode_id, jabatan, nama, created_by)
    values (p_periode, p_jabatan, v_nama, auth.uid())
    on conflict (periode_id, jabatan) where jabatan <> 'anggota'
    do update set nama = excluded.nama, created_by = excluded.created_by;

    perform public.pilkades_catat(
      p_periode, 'ubah_panitia',
      initcap(p_jabatan) || ': ' || v_nama
        || case when v_lama is not null and v_lama <> v_nama
                then ' (sebelumnya ' || v_lama || ')' else '' end
    );
  end if;
end;
$$;

-- 4. Hapus pengurus / anggota ------------------------------------------------------
create or replace function public.pilkades_hapus_panitia(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_periode uuid;
  v_jabatan text;
  v_nama text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;

  delete from public.pilkades_panitia
  where id = p_id
  returning periode_id, jabatan, nama into v_periode, v_jabatan, v_nama;

  if v_nama is null then
    raise exception 'Data panitia tidak ditemukan.';
  end if;

  perform public.pilkades_catat(
    v_periode, 'hapus_panitia', initcap(v_jabatan) || ': ' || v_nama
  );
end;
$$;

revoke execute on function public.pilkades_simpan_panitia(uuid, text, text) from public, anon;
revoke execute on function public.pilkades_hapus_panitia(uuid)              from public, anon;
grant  execute on function public.pilkades_simpan_panitia(uuid, text, text) to authenticated;
grant  execute on function public.pilkades_hapus_panitia(uuid)              to authenticated;

commit;
