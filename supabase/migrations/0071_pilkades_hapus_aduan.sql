-- 0071: Panitia Pilkades boleh MENGHAPUS aduan yang sudah "Selesai diproses" (sudah dibalas).
-- Idempotent. Prasyarat: 0051, 0055, 0069, 0070.
--
-- Panitia tidak punya hak DELETE ke pengajuan_layanan (sengaja). Penghapusan lewat 2 fungsi
-- SECURITY DEFINER yang sempit. Keduanya:
--   * hanya untuk Panitia Pilkades,
--   * hanya aduan Pilkades (kategori pengaduan) yang BUKAN tentang panitia sendiri
--     (aturan yang sama dengan view pilkades_aduan_pantau),
--   * hanya yang sudah diproses (status <> 'diajukan'); yang belum dibalas TIDAK bisa dihapus,
--   * permanen. Kode tracking aduan itu tidak bisa dicek warga lagi.
--
-- ROLLBACK:
--   drop function if exists public.hapus_aduan_pilkades(uuid[]);
--   drop function if exists public.hapus_semua_aduan_pilkades();

begin;

create or replace function public.hapus_aduan_pilkades(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baris int;
begin
  if not public.adalah_panitia_pilkades() then
    raise exception 'Hanya Panitia Pilkades yang boleh menghapus aduan.';
  end if;
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return 0;
  end if;
  if array_length(p_ids, 1) > 500 then
    raise exception 'Terlalu banyak aduan sekaligus (maksimal 500).';
  end if;

  delete from public.pengajuan_layanan p
   where p.id = any (p_ids)
     and p.status <> 'diajukan'
     and p.jenis_pengaduan like 'Pilkades:%'
     and p.jenis_pengaduan not like 'Pilkades: dugaan ketidaknetralan%'
     and p.jenis_pengaduan not like 'Pilkades: pelayanan atau kinerja panitia%'
     and exists (
       select 1 from public.jenis_layanan_master j
        where j.id = p.jenis_layanan_id and j.kategori = 'pengaduan'
     );

  get diagnostics v_baris = row_count;
  return v_baris;
end;
$$;

create or replace function public.hapus_semua_aduan_pilkades()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baris int;
begin
  if not public.adalah_panitia_pilkades() then
    raise exception 'Hanya Panitia Pilkades yang boleh menghapus aduan.';
  end if;

  delete from public.pengajuan_layanan p
   where p.status <> 'diajukan'
     and p.jenis_pengaduan like 'Pilkades:%'
     and p.jenis_pengaduan not like 'Pilkades: dugaan ketidaknetralan%'
     and p.jenis_pengaduan not like 'Pilkades: pelayanan atau kinerja panitia%'
     and exists (
       select 1 from public.jenis_layanan_master j
        where j.id = p.jenis_layanan_id and j.kategori = 'pengaduan'
     );

  get diagnostics v_baris = row_count;
  return v_baris;
end;
$$;

revoke all on function public.hapus_aduan_pilkades(uuid[]) from public, anon;
revoke all on function public.hapus_semua_aduan_pilkades() from public, anon;
grant execute on function public.hapus_aduan_pilkades(uuid[]) to authenticated;
grant execute on function public.hapus_semua_aduan_pilkades() to authenticated;

commit;
