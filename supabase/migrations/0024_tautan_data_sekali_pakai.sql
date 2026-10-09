-- 0024: Tautan Bagikan Data (sekali pakai) untuk instansi/lembaga luar.
-- Jalankan SETELAH 0001-0023 (Supabase Dashboard -> SQL Editor -> New query -> Run).
-- Aman dijalankan ulang (idempotent).
--
-- RINGKASAN
--   * Admin membuat tautan di Pengaturan Desa -> Bagikan Data, mencentang isi
--     yang dibagikan (penduduk lengkap / data KK / statistik saja).
--   * Tautan HANYA bisa dipakai satu kali. Yang disimpan di database cuma
--     HASH (SHA-256) dari token, bukan token-nya, jadi bocornya isi tabel ini
--     tidak membocorkan tautan yang masih aktif.
--   * Data TIDAK disalin ke tabel ini. Data diambil dari tabel warga/keluarga
--     pada saat tautan dibuka, lalu tautan langsung hangus (status 'dibuka').
--   * Pembukaan dilakukan server (SUPABASE_SECRET_KEY), bukan lewat RLS publik.
--     Tabel ini TIDAK punya policy untuk anon sama sekali.
--   * Riwayat tidak bisa dihapus lewat aplikasi (tidak ada policy delete) =
--     jejak audit siapa membagikan apa ke siapa, dan kapan dibuka.

create table if not exists public.tautan_data (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  instansi text not null check (char_length(instansi) between 1 and 120),
  keperluan text check (keperluan is null or char_length(keperluan) <= 300),
  seksi text[] not null check (array_length(seksi, 1) >= 1),
  status text not null default 'aktif'
    check (status in ('aktif', 'dibuka', 'dibatalkan')),
  dibuat_oleh uuid references public.profiles (id) on delete set null,
  dibuat_oleh_nama text,
  dibuat_pada timestamptz not null default now(),
  kedaluwarsa_pada timestamptz not null,
  dibuka_pada timestamptz
);

create index if not exists tautan_data_dibuat_pada_idx
  on public.tautan_data (dibuat_pada desc);

alter table public.tautan_data enable row level security;

-- Hanya Administrator yang bisa melihat riwayat, membuat, dan membatalkan.
drop policy if exists "Admin lihat tautan data" on public.tautan_data;
create policy "Admin lihat tautan data"
  on public.tautan_data for select
  to authenticated
  using (public.adalah_admin());

drop policy if exists "Admin buat tautan data" on public.tautan_data;
create policy "Admin buat tautan data"
  on public.tautan_data for insert
  to authenticated
  with check (public.adalah_admin() and status = 'aktif' and dibuka_pada is null);

drop policy if exists "Admin batalkan tautan data" on public.tautan_data;
create policy "Admin batalkan tautan data"
  on public.tautan_data for update
  to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Penjaga integritas "sekali pakai": tautan yang sudah dibuka/dibatalkan
-- tidak bisa dihidupkan lagi (bahkan oleh admin lewat API), dan isi tautan
-- tidak bisa diubah setelah dibuat.
create or replace function public.jaga_tautan_data()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'aktif' then
    raise exception 'Tautan yang sudah dibuka atau dibatalkan tidak bisa diubah lagi.';
  end if;

  if new.token_hash is distinct from old.token_hash
     or new.instansi is distinct from old.instansi
     or new.keperluan is distinct from old.keperluan
     or new.seksi is distinct from old.seksi
     or new.dibuat_pada is distinct from old.dibuat_pada
     or new.kedaluwarsa_pada is distinct from old.kedaluwarsa_pada
     or new.dibuat_oleh is distinct from old.dibuat_oleh then
    raise exception 'Isi tautan tidak bisa diubah. Buat tautan baru.';
  end if;

  return new;
end;
$$;

drop trigger if exists jaga_tautan_data_trg on public.tautan_data;
create trigger jaga_tautan_data_trg
  before update on public.tautan_data
  for each row execute procedure public.jaga_tautan_data();
