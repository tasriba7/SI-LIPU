-- Berita Desa + APBDes (transparansi anggaran).
-- Diisi perangkat kantor desa lewat /dashboard/berita dan /dashboard/apbdes;
-- tampil di /berita, /apbdes, dan ringkasannya di beranda.
-- Jalankan SETELAH 0040. Foto & dokumen PDF memakai bucket "desa-media".

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Berita
-- ---------------------------------------------------------------------------
create table if not exists public.berita (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  ringkasan text,                          -- teaser di kartu; otomatis dari isi kalau kosong
  isi text not null,
  kategori text not null default 'umum',   -- lihat KATEGORI_BERITA di lib/berita.js
  foto_url text,
  terbit boolean not null default false,   -- false = draf (tidak tampil publik)
  tanggal_terbit timestamptz,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists berita_publik_idx
  on public.berita (terbit, tanggal_terbit desc);

alter table public.berita enable row level security;

drop policy if exists "Publik lihat berita terbit" on public.berita;
create policy "Publik lihat berita terbit"
  on public.berita for select
  to anon, authenticated
  using (terbit = true or public.akses_penuh());

drop policy if exists "Kantor desa kelola berita" on public.berita;
create policy "Kantor desa kelola berita"
  on public.berita for all
  to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

drop trigger if exists set_berita_updated_at on public.berita;
create trigger set_berita_updated_at
  before update on public.berita
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. APBDes: satu baris per tahun anggaran + banyak baris rincian
-- ---------------------------------------------------------------------------
create table if not exists public.apbdes_tahun (
  tahun int primary key check (tahun between 2000 and 2100),
  catatan text,                            -- keterangan singkat untuk warga
  dokumen_url text,                        -- PDF Perdes APBDes (opsional)
  terbit boolean not null default false,   -- false = draf, belum tampil publik
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apbdes_item (
  id uuid primary key default gen_random_uuid(),
  tahun int not null references public.apbdes_tahun (tahun)
    on delete cascade on update cascade,
  jenis text not null check (jenis in (
    'pendapatan', 'belanja', 'pembiayaan_penerimaan', 'pembiayaan_pengeluaran'
  )),
  kelompok text,                           -- mis. "Bidang Pembangunan Desa"
  uraian text not null,
  anggaran bigint not null default 0 check (anggaran >= 0),
  realisasi bigint not null default 0 check (realisasi >= 0),
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists apbdes_item_tahun_idx on public.apbdes_item (tahun, jenis);

alter table public.apbdes_tahun enable row level security;
alter table public.apbdes_item enable row level security;

drop policy if exists "Publik lihat APBDes terbit" on public.apbdes_tahun;
create policy "Publik lihat APBDes terbit"
  on public.apbdes_tahun for select
  to anon, authenticated
  using (terbit = true or public.akses_penuh());

drop policy if exists "Kantor desa kelola tahun APBDes" on public.apbdes_tahun;
create policy "Kantor desa kelola tahun APBDes"
  on public.apbdes_tahun for all
  to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

drop policy if exists "Publik lihat rincian APBDes terbit" on public.apbdes_item;
create policy "Publik lihat rincian APBDes terbit"
  on public.apbdes_item for select
  to anon, authenticated
  using (
    public.akses_penuh()
    or exists (
      select 1 from public.apbdes_tahun t
      where t.tahun = apbdes_item.tahun and t.terbit = true
    )
  );

drop policy if exists "Kantor desa kelola rincian APBDes" on public.apbdes_item;
create policy "Kantor desa kelola rincian APBDes"
  on public.apbdes_item for all
  to authenticated
  using (public.akses_tulis_penuh())
  with check (public.akses_tulis_penuh());

drop trigger if exists set_apbdes_tahun_updated_at on public.apbdes_tahun;
create trigger set_apbdes_tahun_updated_at
  before update on public.apbdes_tahun
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_apbdes_item_updated_at on public.apbdes_item;
create trigger set_apbdes_item_updated_at
  before update on public.apbdes_item
  for each row execute procedure public.set_updated_at();
