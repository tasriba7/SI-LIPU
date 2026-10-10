-- 0037: BANTUAN DESA (penerima bantuan + tampil/sembunyi ke warga).
-- Jalankan SETELAH 0001-0036 (Supabase Dashboard -> SQL Editor -> New query -> Run),
-- dan SEBELUM men-deploy kode aplikasi yang baru. Aman dijalankan ulang (idempotent).
--
-- ISI:
--   1. Tabel jenis_bantuan  : daftar jenis bantuan yang lazim diterima warga desa
--                             (sudah diisi awal; admin boleh tambah/nonaktifkan).
--   2. Tabel penerima_bantuan: siapa menerima bantuan apa, periode, dan saklar
--                             tampil_publik (admin yang mengatur, bawaan: SEMBUNYI).
--   3. RLS: hanya role admin yang boleh membaca/menulis kedua tabel lewat API.
--   4. Dua fungsi baca untuk halaman publik "Cek Bantuan" di Panel Warga.
--      Hanya service_role (server Next.js) yang boleh memanggilnya, jadi tidak
--      bisa ditembus dari browser. Fungsi HANYA mengembalikan nama, dusun/RT/RW,
--      jenis bantuan, dan periode untuk baris yang tampil_publik = true dan
--      warganya berstatus aktif. NIK & data lain tidak pernah ikut.
--
-- CATATAN KEPUTUSAN PEMILIK PROYEK: daftar nama penerima yang DITAMPILKAN admin
-- boleh dilihat publik tanpa login (nama lengkap). Ini pengecualian terhadap
-- aturan "jangan list warga ke publik" di docs/SECURITY.md, dan sudah dicatat di
-- sana. Penjagaannya: saklar tampil_publik per penerima, batas 50 baris per
-- permintaan, NIK/tanggal lahir tidak pernah dikirim.

begin;

-- 1. Jenis bantuan -----------------------------------------------------------------
create table if not exists public.jenis_bantuan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null default 'lainnya'
    check (kategori in ('tunai', 'pangan', 'kesehatan', 'pendidikan', 'perumahan', 'usaha', 'sosial', 'lainnya')),
  penyelenggara text,
  deskripsi text,
  aktif boolean not null default true,
  urutan int not null default 100,
  created_at timestamptz not null default now()
);

create unique index if not exists jenis_bantuan_nama_uq
  on public.jenis_bantuan (lower(nama));

alter table public.jenis_bantuan enable row level security;

drop policy if exists "Admin kelola jenis bantuan" on public.jenis_bantuan;
create policy "Admin kelola jenis bantuan"
  on public.jenis_bantuan for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

revoke all on table public.jenis_bantuan from anon;

-- Isi awal: bantuan yang umum diterima warga desa di Indonesia.
insert into public.jenis_bantuan (nama, kategori, penyelenggara, deskripsi, urutan) values
  ('PKH (Program Keluarga Harapan)',        'tunai',      'Kementerian Sosial',        'Bantuan tunai bersyarat untuk keluarga prasejahtera (ibu hamil, balita, anak sekolah, lansia, disabilitas).', 10),
  ('BPNT / Program Sembako',                'pangan',     'Kementerian Sosial',        'Bantuan pangan non tunai berupa saldo untuk membeli bahan pangan di e-warong/agen.', 20),
  ('BLT Dana Desa',                         'tunai',      'Pemerintah Desa',           'Bantuan langsung tunai dari Dana Desa untuk keluarga miskin/rentan yang ditetapkan lewat musyawarah desa.', 30),
  ('BPJS Kesehatan PBI (KIS)',              'kesehatan',  'Kementerian Kesehatan',     'Iuran jaminan kesehatan ditanggung pemerintah untuk warga tidak mampu.', 40),
  ('PIP (Program Indonesia Pintar)',        'pendidikan', 'Kemendikdasmen',            'Bantuan tunai pendidikan untuk siswa dari keluarga kurang mampu.', 50),
  ('KIP Kuliah',                            'pendidikan', 'Kemendiktisaintek',         'Bantuan biaya kuliah dan biaya hidup bagi mahasiswa kurang mampu berprestasi.', 60),
  ('Bantuan Beasiswa / Pendidikan Desa',    'pendidikan', 'Pemerintah Desa/Daerah',    'Beasiswa atau perlengkapan sekolah dari desa atau pemerintah daerah.', 70),
  ('Bantuan Rumah Tidak Layak Huni (RTLH/BSPS)', 'perumahan', 'Kementerian PUPR/Pemda', 'Bantuan bedah/perbaikan rumah tidak layak huni dan swadaya.', 80),
  ('Bantuan Listrik (sambungan/subsidi)',   'perumahan',  'PLN / Pemerintah',          'Subsidi daya atau sambungan listrik gratis untuk rumah tangga miskin.', 90),
  ('Asistensi Lansia & Disabilitas',        'sosial',     'Kementerian Sosial',        'Bantuan untuk lansia terlantar dan penyandang disabilitas (ASLUT/ATENSI).', 100),
  ('Santunan Kematian / Duka',              'sosial',     'Pemerintah Desa/Daerah',    'Santunan bagi keluarga yang berduka dari warga kurang mampu.', 110),
  ('Bantuan Korban Bencana',                'sosial',     'BPBD / Pemerintah',         'Logistik, tempat tinggal sementara, atau dana stimulan untuk warga terdampak bencana.', 120),
  ('PMT Balita & Ibu Hamil (Cegah Stunting)', 'kesehatan', 'Posyandu / Puskesmas / Desa', 'Pemberian makanan tambahan untuk balita gizi kurang dan ibu hamil risiko kekurangan energi kronis.', 130),
  ('Bantuan Pertanian (bibit, pupuk, alsintan)', 'usaha', 'Dinas Pertanian / Desa',   'Bibit, pupuk subsidi, atau alat mesin pertanian untuk petani/kelompok tani.', 140),
  ('Bantuan Nelayan (perahu, mesin, alat tangkap)', 'usaha', 'Dinas Kelautan & Perikanan', 'Perahu, mesin, jaring, atau alat tangkap bagi nelayan kecil.', 150),
  ('Bantuan Modal Usaha / UMKM',            'usaha',      'Pemerintah / Desa / BUMDes', 'Modal usaha atau pelatihan bagi pelaku usaha mikro dan kecil di desa.', 160),
  ('Bantuan Ternak',                        'usaha',      'Dinas Peternakan / Desa',   'Bibit ternak (ayam, kambing, sapi) untuk warga/kelompok ternak.', 170)
on conflict do nothing;

-- 2. Penerima bantuan ---------------------------------------------------------------
create table if not exists public.penerima_bantuan (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga (id) on delete cascade,
  jenis_bantuan_id uuid not null references public.jenis_bantuan (id) on delete restrict,
  periode text not null default '',
  keterangan text,
  tampil_publik boolean not null default false,
  dicatat_oleh uuid references public.profiles (id) on delete set null,
  dicatat_oleh_nama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint penerima_bantuan_unik unique (warga_id, jenis_bantuan_id, periode),
  constraint penerima_bantuan_periode_panjang check (char_length(periode) <= 60),
  constraint penerima_bantuan_keterangan_panjang check (keterangan is null or char_length(keterangan) <= 500)
);

create index if not exists penerima_bantuan_jenis_idx
  on public.penerima_bantuan (jenis_bantuan_id, periode);
create index if not exists penerima_bantuan_warga_idx
  on public.penerima_bantuan (warga_id);
create index if not exists penerima_bantuan_tampil_idx
  on public.penerima_bantuan (tampil_publik) where tampil_publik;

drop trigger if exists set_penerima_bantuan_updated_at on public.penerima_bantuan;
create trigger set_penerima_bantuan_updated_at
  before update on public.penerima_bantuan
  for each row execute procedure public.set_updated_at();

alter table public.penerima_bantuan enable row level security;

drop policy if exists "Admin kelola penerima bantuan" on public.penerima_bantuan;
create policy "Admin kelola penerima bantuan"
  on public.penerima_bantuan for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

revoke all on table public.penerima_bantuan from anon;

-- 3. Fungsi baca untuk halaman publik "Cek Bantuan" ---------------------------------
-- Ringkasan: program (jenis + periode) yang punya minimal satu penerima tampil.
create or replace function public.bantuan_publik_ringkasan()
returns table (
  jenis_id uuid,
  jenis_nama text,
  kategori text,
  periode text,
  jumlah bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select jb.id, jb.nama, jb.kategori, pb.periode, count(*)::bigint
  from public.penerima_bantuan pb
  join public.jenis_bantuan jb on jb.id = pb.jenis_bantuan_id
  join public.warga w on w.id = pb.warga_id
  where pb.tampil_publik
    and jb.aktif
    and w.status_kependudukan = 'aktif'
  group by jb.id, jb.nama, jb.kategori, jb.urutan, pb.periode
  order by jb.urutan, jb.nama, pb.periode desc
$$;

-- Daftar nama untuk satu program. Hanya kolom yang aman; maksimal 50 baris.
create or replace function public.bantuan_publik_daftar(
  p_jenis uuid,
  p_periode text default null,
  p_cari text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  nama_lengkap text,
  dusun text,
  rt text,
  rw text,
  jenis_nama text,
  periode text,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select w.nama_lengkap, w.dusun, w.rt, w.rw, jb.nama, pb.periode,
         count(*) over ()::bigint as total
  from public.penerima_bantuan pb
  join public.jenis_bantuan jb on jb.id = pb.jenis_bantuan_id
  join public.warga w on w.id = pb.warga_id
  where pb.tampil_publik
    and jb.aktif
    and w.status_kependudukan = 'aktif'
    and pb.jenis_bantuan_id = p_jenis
    and (p_periode is null or pb.periode = p_periode)
    and (
      p_cari is null
      or btrim(p_cari) = ''
      or w.nama_lengkap ilike '%' ||
         replace(replace(replace(btrim(p_cari), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by w.nama_lengkap, w.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke execute on function public.bantuan_publik_ringkasan() from public, anon, authenticated;
revoke execute on function public.bantuan_publik_daftar(uuid, text, text, int, int) from public, anon, authenticated;
grant  execute on function public.bantuan_publik_ringkasan() to service_role;
grant  execute on function public.bantuan_publik_daftar(uuid, text, text, int, int) to service_role;

commit;
