-- 0065: Pilkades - Tahap 1 "rapikan wewenang panitia".
-- Idempotent. Prasyarat: 0054, 0055, 0060, 0063, 0064 sudah dijalankan.
--
-- ISI
--  1. Pembatalan penetapan calon terpilih BUKAN wewenang panitia -> khusus Administrator
--     (koreksi teknis, alasan wajib, tercatat di Riwayat). Sengketa hasil di luar aplikasi.
--  2. Usia minimum pemilih dikunci 17 tahun (tidak bisa diubah lewat aplikasi/API).
--  3. Status calon baru "gugur" (calon yang mengundurkan diri / berhalangan setelah ditetapkan).
--     Alasan wajib untuk "tidak lolos" dan "gugur".
--  4. Calon berstatus "ditetapkan" paling banyak 5 orang; calon terpilih baru bisa
--     ditetapkan bila ada paling sedikit 2 calon ditetapkan.
--
-- ROLLBACK: lihat blok komentar di akhir file.

begin;

-- 1. Batalkan penetapan: khusus admin --------------------------------------------------
create or replace function public.pilkades_batalkan_penetapan(p_periode uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_nama text;
begin
  if not public.adalah_admin() then
    raise exception 'Pembatalan penetapan bukan wewenang panitia. Hubungi Administrator desa.';
  end if;
  if p_alasan is null or length(trim(p_alasan)) < 5 then
    raise exception 'Alasan wajib diisi';
  end if;
  delete from public.pilkades_hasil where periode_id = p_periode returning calon_id::text into v_nama;
  if v_nama is null then
    raise exception 'Belum ada penetapan calon terpilih';
  end if;
  perform public.pilkades_catat(p_periode, 'batal_penetapan', 'Koreksi oleh Administrator: ' || trim(p_alasan));
end;
$$;
revoke execute on function public.pilkades_batalkan_penetapan(uuid, text) from public, anon;
grant  execute on function public.pilkades_batalkan_penetapan(uuid, text) to authenticated;

-- 2. Usia minimum dikunci 17 ------------------------------------------------------------
update public.pilkades_periode set usia_minimum = 17 where usia_minimum <> 17;

create or replace function public.pilkades_periode_usia_17()
returns trigger
language plpgsql
as $$
begin
  new.usia_minimum := 17;
  return new;
end;
$$;
drop trigger if exists pilkades_periode_usia_17 on public.pilkades_periode;
create trigger pilkades_periode_usia_17
  before insert or update on public.pilkades_periode
  for each row execute function public.pilkades_periode_usia_17();

-- 3. Status calon "gugur" ---------------------------------------------------------------
alter table public.pilkades_calon drop constraint if exists pilkades_calon_status_check;
alter table public.pilkades_calon
  add constraint pilkades_calon_status_check
  check (status in ('mendaftar', 'lolos_verifikasi', 'tidak_lolos', 'ditetapkan', 'gugur'));

-- 4. Batas jumlah calon ditetapkan + alasan wajib --------------------------------------------
create or replace function public.pilkades_calon_aturan()
returns trigger
language plpgsql
as $$
declare v_jumlah integer;
begin
  if new.status in ('tidak_lolos', 'gugur') and length(trim(coalesce(new.alasan, ''))) < 5 then
    raise exception 'Alasan wajib diisi (minimal 5 huruf) untuk calon yang tidak lolos atau gugur.';
  end if;
  if new.status = 'ditetapkan' then
    select count(*) into v_jumlah from public.pilkades_calon
    where periode_id = new.periode_id and status = 'ditetapkan' and id <> new.id;
    if v_jumlah >= 5 then
      raise exception 'Calon yang ditetapkan paling banyak 5 orang.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists pilkades_calon_aturan on public.pilkades_calon;
create trigger pilkades_calon_aturan
  before insert or update on public.pilkades_calon
  for each row execute function public.pilkades_calon_aturan();

-- Penetapan calon terpilih butuh minimal 2 calon ditetapkan (dipasang di tabel hasil
-- supaya fungsi penetapan dari 0063/0064 tidak perlu ditulis ulang).
create or replace function public.pilkades_hasil_min_calon()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.pilkades_calon
      where periode_id = new.periode_id and status = 'ditetapkan') < 2 then
    raise exception 'Calon terpilih baru bisa ditetapkan bila ada paling sedikit 2 calon yang ditetapkan. Hubungi Panitia Kabupaten bila calon tinggal satu.';
  end if;
  return new;
end;
$$;
drop trigger if exists pilkades_hasil_min_calon on public.pilkades_hasil;
create trigger pilkades_hasil_min_calon
  before insert on public.pilkades_hasil
  for each row execute function public.pilkades_hasil_min_calon();

commit;

-- ROLLBACK (manual):
--   drop trigger if exists pilkades_hasil_min_calon on public.pilkades_hasil;
--   drop trigger if exists pilkades_calon_aturan on public.pilkades_calon;
--   drop trigger if exists pilkades_periode_usia_17 on public.pilkades_periode;
--   (kembalikan pilkades_batalkan_penetapan dari 0060 bila ingin panitia boleh membatalkan)
