-- 0062: Pilkades - jadwal tanggal tiap tahapan (tampil sebagai garis waktu di beranda Pilkades).
-- Idempotent. Prasyarat: 0051, 0052 sudah dijalankan (fungsi boleh_lihat_pilkades,
-- boleh_kelola_pilkades, pilkades_catat).
--
-- PRINSIP:
--  * Satu baris = satu tahapan dalam satu periode (kunci tahapan dibatasi daftar tetap).
--  * Tanggal MULAI wajib; tanggal SELESAI boleh kosong (berarti satu hari).
--  * Tahap "pemungutan suara" TIDAK disimpan di sini: tanggalnya diambil dari
--    pilkades_periode.tanggal_pemungutan (diatur Administrator) agar tidak ada dua sumber.
--  * Lihat: admin + panitia. Ubah: HANYA panitia, lewat fungsi (tercatat di Riwayat).
--
-- ROLLBACK: drop function public.pilkades_simpan_jadwal(uuid, jsonb);
--           drop table public.pilkades_jadwal;

begin;

create table if not exists public.pilkades_jadwal (
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  tahap text not null check (tahap in (
    'persiapan', 'daftar_pemilih', 'pengumuman_dps', 'penetapan_dpt',
    'pendaftaran_calon', 'penetapan_calon', 'kampanye', 'masa_tenang', 'penetapan_terpilih'
  )),
  mulai date not null,
  selesai date,
  catatan text check (catatan is null or char_length(catatan) <= 200),
  diubah_oleh uuid references public.profiles(id) on delete set null,
  diubah_pada timestamptz not null default now(),
  primary key (periode_id, tahap),
  check (selesai is null or selesai >= mulai)
);

revoke all on public.pilkades_jadwal from public, anon, authenticated;
grant select on public.pilkades_jadwal to authenticated;
alter table public.pilkades_jadwal enable row level security;
drop policy if exists "pilkades_jadwal_lihat" on public.pilkades_jadwal;
create policy "pilkades_jadwal_lihat" on public.pilkades_jadwal
  for select to authenticated using (public.boleh_lihat_pilkades());

-- Simpan SELURUH jadwal satu periode sekaligus.
-- p_data: [{"tahap":"kampanye","mulai":"2026-11-01","selesai":"2026-11-10","catatan":"..."}, ...]
-- Tahap yang tidak ada di p_data dihapus (artinya "belum dijadwalkan").
create or replace function public.pilkades_simpan_jadwal(p_periode uuid, p_data jsonb)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_n integer := 0;
  r jsonb;
  v_mulai date;
  v_selesai date;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'array' then
    raise exception 'Data jadwal tidak valid';
  end if;

  -- periksa semua baris dulu, baru tulis (semua atau tidak sama sekali)
  for r in select * from jsonb_array_elements(p_data) loop
    v_mulai := (r->>'mulai')::date;
    v_selesai := nullif(r->>'selesai', '')::date;
    if v_selesai is not null and v_selesai < v_mulai then
      raise exception 'Tanggal selesai "%" tidak boleh sebelum tanggal mulai', r->>'tahap';
    end if;
  end loop;

  delete from public.pilkades_jadwal where periode_id = p_periode;

  for r in select * from jsonb_array_elements(p_data) loop
    insert into public.pilkades_jadwal (periode_id, tahap, mulai, selesai, catatan, diubah_oleh, diubah_pada)
    values (
      p_periode, r->>'tahap', (r->>'mulai')::date, nullif(r->>'selesai', '')::date,
      nullif(left(btrim(coalesce(r->>'catatan', '')), 200), ''), auth.uid(), now()
    );
    v_n := v_n + 1;
  end loop;

  perform public.pilkades_catat(p_periode, 'ubah_jadwal', v_n || ' tahapan dijadwalkan');
  return v_n;
end;
$$;

revoke execute on function public.pilkades_simpan_jadwal(uuid, jsonb) from public, anon;
grant  execute on function public.pilkades_simpan_jadwal(uuid, jsonb) to authenticated;

commit;
