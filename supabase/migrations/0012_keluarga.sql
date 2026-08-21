-- Modul Kartu Keluarga: konsistensi data 1 KK = 1 alamat, dan jaminan sistem
-- maksimal 1 Kepala Keluarga aktif per No. KK.
--
-- DESAIN: tabel `warga` TIDAK diubah (kolom no_kk/alamat/dusun/rt/rw tetap
-- ada di sana) supaya semua kode yang sudah ada (form tambah/edit warga,
-- impor/ekspor Excel, surat, statistik beranda, pengaturan desa) tetap
-- jalan tanpa perubahan. Tabel `keluarga` baru berfungsi sebagai "sumber
-- kebenaran" alamat per No. KK, disinkronkan otomatis oleh trigger di
-- bawah setiap kali baris warga ditambah/diubah:
--   1. Kalau No. KK baru -> dibuatkan record keluarga baru.
--   2. Kalau anggota mengisi alamat/dusun/rt/rw -> nilai itu jadi alamat
--      resmi keluarga & otomatis disamakan ke SEMUA anggota lain di
--      No. KK yang sama (menjawab masalah "data tidak konsisten").
--   3. Kalau anggota BARU ditambah tanpa isi alamat -> otomatis ikut
--      alamat keluarga yang sudah tercatat (tidak perlu ketik ulang).
--   4. Kalau ada 2 orang ditandai "Kepala Keluarga" pada No. KK yang sama
--      -> ditolak oleh database (bukan cuma diperingatkan di UI).

create table if not exists public.keluarga (
  id uuid primary key default gen_random_uuid(),
  no_kk text not null unique check (no_kk ~ '^\d{16}$'),
  alamat text,
  dusun text,
  rt text,
  rw text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists keluarga_no_kk_idx on public.keluarga (no_kk);

alter table public.keluarga enable row level security;

drop policy if exists "Staf bisa kelola data keluarga" on public.keluarga;
create policy "Staf bisa kelola data keluarga"
  on public.keluarga for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists set_keluarga_updated_at on public.keluarga;
create trigger set_keluarga_updated_at
  before update on public.keluarga
  for each row execute procedure public.set_updated_at();

-- Fungsi inti sinkronisasi + penjamin 1 Kepala Keluarga per No. KK.
create or replace function public.sinkronkan_keluarga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kk public.keluarga%rowtype;
  v_ada_isian boolean;
begin
  -- Warga tanpa No. KK (belum lengkap datanya) tidak disinkron, tidak diblok.
  if new.no_kk is null or new.no_kk = '' then
    return new;
  end if;

  -- Jaminan sistem: maksimal 1 Kepala Keluarga aktif per No. KK.
  if new.status_dalam_kk = 'Kepala Keluarga' and exists (
    select 1 from public.warga
    where no_kk = new.no_kk
      and status_dalam_kk = 'Kepala Keluarga'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception
      'Kartu Keluarga % sudah memiliki Kepala Keluarga lain. Satu KK hanya boleh 1 Kepala Keluarga.',
      new.no_kk
      using errcode = 'P0001';
  end if;

  select * into v_kk from public.keluarga where no_kk = new.no_kk;
  v_ada_isian :=
    coalesce(new.alamat, '') <> '' or coalesce(new.dusun, '') <> ''
    or coalesce(new.rt, '') <> '' or coalesce(new.rw, '') <> '';

  if v_kk.id is null then
    -- No. KK baru bagi sistem -> catat sebagai data keluarga baru.
    insert into public.keluarga (no_kk, alamat, dusun, rt, rw)
    values (new.no_kk, new.alamat, new.dusun, new.rt, new.rw);
  elsif v_ada_isian then
    -- Anggota ini mengisi alamat -> jadikan alamat resmi keluarga.
    update public.keluarga
      set alamat = new.alamat, dusun = new.dusun, rt = new.rt, rw = new.rw
      where no_kk = new.no_kk;

    -- Ratakan ke semua anggota LAIN di No. KK yang sama. Dibatasi
    -- pg_trigger_depth() supaya tidak rekursi tak terbatas (baris yang
    -- ikut diupdate di sini juga memicu trigger ini, tapi hanya 1 level).
    if pg_trigger_depth() <= 1 then
      update public.warga
        set alamat = new.alamat, dusun = new.dusun, rt = new.rt, rw = new.rw
        where no_kk = new.no_kk and id <> new.id;
    end if;
  else
    -- Anggota baru tidak mengisi alamat -> otomatis ikut alamat keluarga.
    new.alamat := v_kk.alamat;
    new.dusun := v_kk.dusun;
    new.rt := v_kk.rt;
    new.rw := v_kk.rw;
  end if;

  return new;
end;
$$;

drop trigger if exists sinkronkan_keluarga_trigger on public.warga;
create trigger sinkronkan_keluarga_trigger
  before insert or update on public.warga
  for each row execute procedure public.sinkronkan_keluarga();

-- Backfill: kalau migrasi ini dijalankan di database yang sudah ada isinya,
-- rapikan data lama supaya konsisten per No. KK (alamat diambil dari baris
-- Kepala Keluarga kalau ada, kalau tidak dari baris pertama yang mengisi).
insert into public.keluarga (no_kk, alamat, dusun, rt, rw)
select distinct on (w.no_kk)
  w.no_kk, w.alamat, w.dusun, w.rt, w.rw
from public.warga w
where w.no_kk is not null and w.no_kk <> ''
order by w.no_kk, (w.status_dalam_kk = 'Kepala Keluarga') desc, w.created_at asc
on conflict (no_kk) do nothing;

update public.warga w
  set alamat = k.alamat, dusun = k.dusun, rt = k.rt, rw = k.rw
from public.keluarga k
where w.no_kk = k.no_kk;
