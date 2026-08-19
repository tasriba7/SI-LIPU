-- Tambah kolom No. HP/WhatsApp (opsional) ke data kependudukan, supaya bisa
-- ikut auto-isi di form pengajuan layanan manapun — sama seperti nama &
-- alamat. Jalankan SETELAH 0001-0006.

alter table public.warga
  add column if not exists no_hp text;

-- Perbarui RPC lookup publik supaya no_hp ikut dikembalikan (tetap dua
-- faktor NIK+Tanggal Lahir, tetap field terbatas sesuai SECURITY.md — no_hp
-- BUKAN data sensitif seperti agama/status kawin, jadi aman ikut di-return
-- untuk kebutuhan auto-fill).
create or replace function public.cari_warga_publik(
  p_nik text,
  p_tanggal_lahir date,
  p_identifier text
)
returns table (
  warga_id uuid,
  nama_lengkap text,
  dusun text,
  rt text,
  rw text,
  no_hp text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.warga%rowtype;
begin
  select * into v_row
  from public.warga w
  where w.nik = p_nik and w.tanggal_lahir = p_tanggal_lahir
  limit 1;

  insert into public.log_pencarian_warga (identifier, nik_dicoba, berhasil)
  values (p_identifier, p_nik, v_row.id is not null);

  if v_row.id is null then
    return;
  end if;

  return query
    select v_row.id, v_row.nama_lengkap, v_row.dusun, v_row.rt, v_row.rw, v_row.no_hp;
end;
$$;

grant execute on function public.cari_warga_publik(text, date, text) to anon, authenticated;
