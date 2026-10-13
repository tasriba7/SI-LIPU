-- 0050: Transparansi penanganan aduan di beranda publik.
-- Jalankan SETELAH 0049. Idempotent — aman dijalankan ulang.
--
-- 1. Kolom `selesai_at`: kapan sebuah pengajuan berubah menjadi 'selesai'.
--    Diisi OTOMATIS oleh trigger (aplikasi tidak perlu diubah). Dipakai untuk
--    menghitung rata-rata lama penanganan yang akurat -- `updated_at` tidak
--    cocok karena ikut berubah setiap ada suntingan catatan.
-- 2. Fungsi `ringkasan_penanganan_aduan()`: HANYA angka agregat (jumlah per
--    status + rata-rata jam penyelesaian). Tidak ada nama, NIK, kode tracking,
--    atau isi pengaduan yang keluar, jadi aman dibaca publik (termasuk untuk
--    pengaduan anonim). Pengaduan berstatus 'ditolak' tidak dihitung, sama
--    seperti aduan_populer() (0049).

begin;

alter table public.pengajuan_layanan
  add column if not exists selesai_at timestamptz;

-- Isi mundur untuk pengajuan yang sudah selesai sebelum migrasi ini. Trigger
-- updated_at dimatikan sebentar supaya tanggal "terakhir diperbarui" tidak ikut berubah.
alter table public.pengajuan_layanan disable trigger set_pengajuan_layanan_updated_at;
update public.pengajuan_layanan
   set selesai_at = updated_at
 where status = 'selesai' and selesai_at is null;
alter table public.pengajuan_layanan enable trigger set_pengajuan_layanan_updated_at;

create or replace function public.catat_waktu_selesai()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'selesai' then
    if tg_op = 'INSERT' or old.status is distinct from 'selesai' then
      new.selesai_at := now();
    end if;
  else
    -- Dibuka kembali / belum selesai: tidak ada waktu selesai.
    new.selesai_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists catat_waktu_selesai_trg on public.pengajuan_layanan;
create trigger catat_waktu_selesai_trg
  before insert or update of status on public.pengajuan_layanan
  for each row execute procedure public.catat_waktu_selesai();

create or replace function public.ringkasan_penanganan_aduan()
returns table (
  total bigint,
  selesai bigint,
  diproses bigint,
  menunggu bigint,
  rata_rata_jam numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*)::bigint,
    (count(*) filter (where pl.status = 'selesai'))::bigint,
    (count(*) filter (where pl.status = 'diproses'))::bigint,
    (count(*) filter (where pl.status = 'diajukan'))::bigint,
    round(
      (
        avg(extract(epoch from (pl.selesai_at - pl.created_at)) / 3600)
          filter (where pl.status = 'selesai' and pl.selesai_at is not null)
      )::numeric,
      1
    )
  from public.pengajuan_layanan pl
  where pl.jenis_pengaduan is not null
    and pl.status <> 'ditolak';
$$;

revoke all on function public.ringkasan_penanganan_aduan() from public;
grant execute on function public.ringkasan_penanganan_aduan() to anon, authenticated, service_role;

commit;
