-- Warga bisa melihat RIWAYAT pengajuannya sendiri (mis. lupa kode tracking)
-- dengan memasukkan NIK + tanggal lahir. Jalankan SETELAH 0022.
--
-- Mengikuti docs/SECURITY.md:
--  * dua faktor (NIK + tanggal lahir) harus cocok BERSAMAAN;
--  * "tidak cocok" dan "cocok tapi belum punya pengajuan" memberi hasil yang sama (kosong);
--  * setiap percobaan dicatat di log_pencarian_warga (dasar rate limit 5 gagal/15 menit,
--    dicek di server action sebelum RPC ini dipanggil);
--  * hanya kolom aman yang dikembalikan: BUKAN NIK, no HP, alamat, isi keluhan/keterangan.
-- Pengaduan ANONIM tidak pernah muncul (identitasnya memang tidak disimpan).

create or replace function public.riwayat_pengajuan_publik(
  p_nik text,
  p_tanggal_lahir date,
  p_identifier text
)
returns table (
  kode_tracking text,
  nama_layanan text,
  status text,
  catatan_admin text,
  created_at timestamptz,
  updated_at timestamptz,
  nomor_surat text,
  tanggal_surat date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cocok boolean;
begin
  select exists (
    select 1 from public.warga w
    where w.nik = p_nik and w.tanggal_lahir = p_tanggal_lahir
  ) into v_cocok;

  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_cocok);

  if not v_cocok then
    return;
  end if;

  return query
  select * from (
    select pl.kode_tracking, jlm.nama_layanan, pl.status, pl.catatan_admin,
           pl.created_at, pl.updated_at, st.nomor_surat, st.tanggal_surat
    from public.pengajuan_layanan pl
    join public.jenis_layanan_master jlm on jlm.id = pl.jenis_layanan_id
    left join public.surat_terbit st on st.pengajuan_id = pl.id
    where pl.nik = p_nik and coalesce(pl.anonim, false) = false
    union all
    select ps.kode_tracking, ps.jenis_surat, ps.status, ps.catatan_admin,
           ps.created_at, ps.updated_at, st.nomor_surat, st.tanggal_surat
    from public.pengajuan_surat ps
    left join public.surat_terbit st on st.pengajuan_surat_id = ps.id
    where ps.nik = p_nik
  ) r
  order by r.created_at desc
  limit 50;
end;
$$;

grant execute on function public.riwayat_pengajuan_publik(text, date, text) to anon, authenticated;
