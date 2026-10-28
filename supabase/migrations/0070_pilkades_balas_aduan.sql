-- 0070: Tombol "Balas Aduan" untuk Panitia Pilkades.
-- Idempotent. Prasyarat: 0051, 0055, 0069 sudah dijalankan.
--
-- Panitia TIDAK punya hak update ke pengajuan_layanan (sengaja, lihat 0069). Karena itu balasan
-- dilakukan lewat fungsi SECURITY DEFINER yang sangat sempit:
--   * hanya Panitia Pilkades yang boleh memanggil,
--   * hanya aduan berjenis "Pilkades: ..." (kategori pengaduan) yang BUKAN tentang panitia sendiri
--     (aturan yang sama dengan view pilkades_aduan_pantau),
--   * hanya aduan berstatus "diajukan" (sudah dibalas tidak bisa ditimpa),
--   * hanya mengisi status = 'diproses', catatan_admin (isi balasan, terlihat warga di cek status),
--     dan diproses_oleh. Tidak ada jalur menolak.
--
-- ROLLBACK:  drop function if exists public.balas_aduan_pilkades(uuid, text);

begin;

create or replace function public.balas_aduan_pilkades(p_id uuid, p_balasan text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balasan text := nullif(btrim(coalesce(p_balasan, '')), '');
  v_baris int;
begin
  if not public.adalah_panitia_pilkades() then
    raise exception 'Hanya Panitia Pilkades yang boleh membalas aduan.';
  end if;
  if v_balasan is null then
    raise exception 'Isi balasan tidak boleh kosong.';
  end if;
  if char_length(v_balasan) > 1000 then
    raise exception 'Balasan terlalu panjang (maksimal 1000 karakter).';
  end if;

  update public.pengajuan_layanan p
     set status = 'diproses',
         catatan_admin = v_balasan,
         diproses_oleh = auth.uid()
   where p.id = p_id
     and p.status = 'diajukan'
     and p.jenis_pengaduan like 'Pilkades:%'
     and p.jenis_pengaduan not like 'Pilkades: dugaan ketidaknetralan%'
     and p.jenis_pengaduan not like 'Pilkades: pelayanan atau kinerja panitia%'
     and exists (
       select 1 from public.jenis_layanan_master j
        where j.id = p.jenis_layanan_id and j.kategori = 'pengaduan'
     );

  get diagnostics v_baris = row_count;
  return v_baris > 0;
end;
$$;

revoke all on function public.balas_aduan_pilkades(uuid, text) from public, anon;
grant execute on function public.balas_aduan_pilkades(uuid, text) to authenticated;

commit;
