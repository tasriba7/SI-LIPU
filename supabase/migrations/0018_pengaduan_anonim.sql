-- Pengaduan anonim: warga boleh memilih merahasiakan identitas saat mengadu.
-- Jalankan SETELAH 0017.
--
-- PRINSIP: kalau warga memilih anonim, nama / NIK / No. HP / tautan ke data
-- warga TIDAK PERNAH DISIMPAN sama sekali. Jadi bukan sekadar "disembunyikan
-- di layar admin" -- datanya memang tidak ada di database, sehingga tidak ada
-- siapa pun (admin, Kepala Desa, pengelola database) yang bisa melacaknya.
-- Satu-satunya "kunci" milik pelapor adalah kode tracking (dipakai untuk cek
-- status).

-- 1. Kolom penanda + izinkan identitas kosong (khusus anonim).
alter table public.pengajuan_layanan
  add column if not exists anonim boolean not null default false;

alter table public.pengajuan_layanan alter column nama_pemohon drop not null;
alter table public.pengajuan_layanan alter column nik drop not null;
alter table public.pengajuan_layanan alter column no_hp drop not null;

-- 2. Pagar terakhir di level database: baris anonim DILARANG menyimpan identitas.
alter table public.pengajuan_layanan
  drop constraint if exists pengajuan_anonim_tanpa_identitas;
alter table public.pengajuan_layanan
  add constraint pengajuan_anonim_tanpa_identitas
  check (
    anonim = false
    or (nama_pemohon is null and nik is null and no_hp is null and warga_id is null)
  );

-- 3. Trigger penjaga (berlaku walau aplikasi / pemanggil mencoba curang).
create or replace function public.jaga_pengaduan_anonim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kategori text;
begin
  if tg_op = 'INSERT' then
    if new.anonim then
      select kategori into v_kategori
      from public.jenis_layanan_master
      where id = new.jenis_layanan_id;

      if v_kategori is distinct from 'pengaduan' then
        raise exception 'Mode anonim hanya untuk layanan pengaduan.';
      end if;

      -- Paksa kosong, apa pun yang dikirim pemanggil.
      new.nama_pemohon := null;
      new.nik := null;
      new.no_hp := null;
      new.warga_id := null;
    else
      if new.nama_pemohon is null or new.nik is null or new.no_hp is null then
        raise exception 'Nama, NIK, dan No. HP wajib diisi.';
      end if;
    end if;
  else
    -- UPDATE: status anonim tidak bisa diubah, identitas tidak bisa diisi
    -- belakangan (mencegah pembongkaran identitas pelapor).
    new.anonim := old.anonim;
    if old.anonim then
      new.nama_pemohon := null;
      new.nik := null;
      new.no_hp := null;
      new.warga_id := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists jaga_pengaduan_anonim_trg on public.pengajuan_layanan;
create trigger jaga_pengaduan_anonim_trg
  before insert or update on public.pengajuan_layanan
  for each row execute procedure public.jaga_pengaduan_anonim();

-- 4. Cek status publik: nama_pemohon otomatis kosong untuk pengaduan anonim
--    (kolom kembalian sama seperti sebelumnya, jadi aman di-replace).
create or replace function public.cek_status_pengajuan_layanan(p_kode text)
returns table (
  kode_tracking text,
  nama_layanan text,
  nama_pemohon text,
  status text,
  catatan_admin text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    pl.kode_tracking,
    jlm.nama_layanan,
    case when pl.anonim then null else pl.nama_pemohon end,
    pl.status,
    pl.catatan_admin,
    pl.created_at,
    pl.updated_at
  from public.pengajuan_layanan pl
  join public.jenis_layanan_master jlm on jlm.id = pl.jenis_layanan_id
  where pl.kode_tracking = p_kode;
$$;

grant execute on function public.cek_status_pengajuan_layanan(text) to anon, authenticated;
