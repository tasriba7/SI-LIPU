-- 0062: Pilkades - jadwal tahapan yang BISA DIATUR panitia (nama, urutan, tambah, hapus)
-- dan tampil sebagai progres + garis waktu di beranda Pilkades.
-- Prasyarat: 0051, 0052 sudah dijalankan (boleh_lihat_pilkades, boleh_kelola_pilkades, pilkades_catat).
--
-- PRINSIP:
--  * Satu baris = satu tahapan dalam satu periode. Nama, penjelasan, urutan bebas diatur panitia.
--  * `jenis` (opsional) menandai tahap yang selesai OTOMATIS dari data aplikasi:
--      dps | dpt | calon | hasil | pemungutan. Tiap jenis maksimal satu kali per periode.
--  * Tahap 'pemungutan' tidak menyimpan tanggal: tanggalnya dari pilkades_periode.tanggal_pemungutan
--    (diatur Administrator) agar tidak ada dua sumber.
--  * Lihat: admin + panitia. Ubah: HANYA panitia, lewat fungsi (tercatat di Riwayat).
--
-- AMAN dijalankan ulang. Bila sebelumnya sudah menjalankan versi awal 0062 (kolom `tahap`),
-- tabel lama (hanya berisi tanggal jadwal) diganti dengan bentuk baru; tanggalnya perlu diisi ulang.
--
-- ROLLBACK: drop function public.pilkades_simpan_jadwal(uuid, jsonb);
--           drop table public.pilkades_jadwal;

begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pilkades_jadwal' and column_name = 'tahap'
  ) then
    drop table public.pilkades_jadwal;
  end if;
end $$;

create table if not exists public.pilkades_jadwal (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  urutan integer not null,
  nama text not null check (char_length(nama) between 3 and 80),
  arti text check (arti is null or char_length(arti) <= 200),
  jenis text check (jenis is null or jenis in ('dps', 'dpt', 'calon', 'hasil', 'pemungutan')),
  mulai date,
  selesai date,
  catatan text check (catatan is null or char_length(catatan) <= 200),
  diubah_oleh uuid references public.profiles(id) on delete set null,
  diubah_pada timestamptz not null default now(),
  check (selesai is null or (mulai is not null and selesai >= mulai))
);

create unique index if not exists pilkades_jadwal_satu_jenis
  on public.pilkades_jadwal (periode_id, jenis) where jenis is not null;
create index if not exists pilkades_jadwal_urut on public.pilkades_jadwal (periode_id, urutan);

revoke all on public.pilkades_jadwal from public, anon, authenticated;
grant select on public.pilkades_jadwal to authenticated;
alter table public.pilkades_jadwal enable row level security;
drop policy if exists "pilkades_jadwal_lihat" on public.pilkades_jadwal;
create policy "pilkades_jadwal_lihat" on public.pilkades_jadwal
  for select to authenticated using (public.boleh_lihat_pilkades());

-- Simpan SELURUH daftar tahapan satu periode sekaligus (urutan = urutan array).
-- p_data: [{"jenis":"dps"|null,"nama":"...","arti":"...","mulai":"2026-11-01","selesai":"","catatan":""}, ...]
-- Semua atau tidak sama sekali: bila ada baris tidak valid, tidak ada yang berubah.
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
  v_jenis text;
  v_nama text;
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
  if jsonb_array_length(p_data) > 30 then
    raise exception 'Maksimal 30 tahapan';
  end if;

  delete from public.pilkades_jadwal where periode_id = p_periode;

  for r in select * from jsonb_array_elements(p_data) loop
    v_n := v_n + 1;
    v_nama := btrim(coalesce(r->>'nama', ''));
    if char_length(v_nama) < 3 then
      raise exception 'Tahap nomor %: nama minimal 3 huruf', v_n;
    end if;
    v_jenis := nullif(r->>'jenis', '');
    v_mulai := nullif(r->>'mulai', '')::date;
    v_selesai := nullif(r->>'selesai', '')::date;
    if v_jenis = 'pemungutan' then
      v_mulai := null; v_selesai := null;
    end if;
    if v_selesai is not null and (v_mulai is null or v_selesai < v_mulai) then
      raise exception 'Tahap "%": tanggal selesai tidak boleh sebelum tanggal mulai', v_nama;
    end if;

    insert into public.pilkades_jadwal (periode_id, urutan, nama, arti, jenis, mulai, selesai, catatan, diubah_oleh, diubah_pada)
    values (
      p_periode, v_n, left(v_nama, 80),
      nullif(left(btrim(coalesce(r->>'arti', '')), 200), ''),
      v_jenis, v_mulai, v_selesai,
      nullif(left(btrim(coalesce(r->>'catatan', '')), 200), ''),
      auth.uid(), now()
    );
  end loop;

  perform public.pilkades_catat(p_periode, 'ubah_jadwal', v_n || ' tahapan disimpan');
  return v_n;
exception
  when unique_violation then
    raise exception 'Satu jenis tahap otomatis (DPS, DPT, calon, hasil, pemungutan) hanya boleh dipakai sekali';
end;
$$;

revoke execute on function public.pilkades_simpan_jadwal(uuid, jsonb) from public, anon;
grant  execute on function public.pilkades_simpan_jadwal(uuid, jsonb) to authenticated;

commit;
