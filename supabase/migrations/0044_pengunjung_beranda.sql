-- 0044: Penghitung pengunjung beranda publik.
-- Jalankan SETELAH 0042 (urutan nomor 0043 dilewati di sini; tidak bergantung
-- padanya). Idempotent — aman dijalankan ulang.
--
-- PRIVASI: yang disimpan HANYA angka per hari (tanggal + jumlah). Tidak ada
-- IP, tidak ada ID perangkat, tidak ada riwayat kunjungan per orang.
--
-- DEFINISI "pengunjung": satu browser dihitung MAKSIMAL SEKALI per hari
-- (penyaringannya lewat cookie yang hanya berisi tanggal, diatur di
-- app/api/pengunjung/route.js). Refresh/buka ulang di hari yang sama tidak
-- menambah angka. Hari dihitung menurut WITA (Asia/Makassar).
--
-- AKSES: tabel dikunci (RLS aktif tanpa policy). Menambah angka hanya bisa
-- lewat fungsi catat_kunjungan() oleh service_role (server). Membaca angka
-- boleh publik lewat statistik_pengunjung() — hanya dua angka agregat.

begin;

create table if not exists public.pengunjung_harian (
  tanggal date primary key,
  jumlah integer not null default 0 check (jumlah >= 0)
);

alter table public.pengunjung_harian enable row level security;
revoke all on table public.pengunjung_harian from anon, authenticated;

-- Catat satu kunjungan, kecuali browser ini sudah dihitung hari ini.
-- p_terakhir = tanggal yang tersimpan di cookie browser (atau null).
create or replace function public.catat_kunjungan(p_terakhir date default null)
returns table (
  r_dihitung boolean,
  r_tanggal date,
  r_total bigint,
  r_hari_ini integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hari date := (now() at time zone 'Asia/Makassar')::date;
  v_dihitung boolean := false;
begin
  if p_terakhir is distinct from v_hari then
    insert into public.pengunjung_harian as ph (tanggal, jumlah)
    values (v_hari, 1)
    on conflict (tanggal) do update set jumlah = ph.jumlah + 1;
    v_dihitung := true;
  end if;

  return query
    select
      v_dihitung,
      v_hari,
      (select coalesce(sum(ph.jumlah), 0) from public.pengunjung_harian ph)::bigint,
      coalesce((select ph.jumlah from public.pengunjung_harian ph where ph.tanggal = v_hari), 0);
end;
$$;

revoke all on function public.catat_kunjungan(date) from public, anon, authenticated;
grant execute on function public.catat_kunjungan(date) to service_role;

-- Baca angka (publik): total sepanjang waktu + hari ini.
create or replace function public.statistik_pengunjung()
returns table (
  total_pengunjung bigint,
  pengunjung_hari_ini integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select coalesce(sum(jumlah), 0) from public.pengunjung_harian)::bigint,
    coalesce(
      (select jumlah from public.pengunjung_harian
       where tanggal = (now() at time zone 'Asia/Makassar')::date),
      0
    );
$$;

revoke all on function public.statistik_pengunjung() from public;
grant execute on function public.statistik_pengunjung() to anon, authenticated, service_role;

commit;
