-- Fase 2 - Modul 4: Surat otomatis dari pengajuan layanan.
-- Admin menekan "Buat Surat" pada detail pengajuan, isi surat terisi otomatis
-- dari data warga, lalu admin mengisi nomor surat, mengedit bila perlu, dan
-- mencetak/menyimpan PDF. Jalankan SETELAH 0001-0019.
--
-- Dua tabel:
--   template_surat : redaksi surat per jenis, diedit ADMIN (bukan developer).
--   surat_terbit   : SALINAN FINAL surat yang sudah diterbitkan. Berisi snapshot
--                    isi surat, jadi mengubah template tidak mengubah surat lama.

create extension if not exists pgcrypto;

-- 1. Template surat -----------------------------------------------------------
create table if not exists public.template_surat (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,            -- mis. 'sktm', 'domisili'
  nama text not null,                   -- nama di dropdown
  kata_kunci text[] not null default '{}', -- dicocokkan ke nama jenis layanan (huruf kecil)
  judul text not null,                  -- mis. SURAT KETERANGAN TIDAK MAMPU
  pembuka text not null,                -- paragraf pembuka (boleh pakai {{variabel}})
  biodata jsonb not null default '[]'::jsonb,  -- [{ "label": "Nama", "value": "{{nama}}" }]
  isi text not null default '',         -- paragraf isi; pisahkan paragraf dengan baris kosong
  penutup text not null default '',
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.template_surat enable row level security;

drop policy if exists "Staf bisa lihat template surat" on public.template_surat;
create policy "Staf bisa lihat template surat"
  on public.template_surat for select to authenticated using (true);

drop policy if exists "Admin bisa kelola template surat" on public.template_surat;
create policy "Admin bisa kelola template surat"
  on public.template_surat for all to authenticated
  using (public.adalah_admin()) with check (public.adalah_admin());

drop trigger if exists set_template_surat_updated_at on public.template_surat;
create trigger set_template_surat_updated_at
  before update on public.template_surat
  for each row execute procedure public.set_updated_at();

-- 2. Surat terbit ---------------------------------------------------------------
create table if not exists public.surat_terbit (
  id uuid primary key default gen_random_uuid(),
  pengajuan_id uuid not null unique references public.pengajuan_layanan (id) on delete restrict,
  template_id uuid references public.template_surat (id) on delete set null,
  nomor_surat text not null,
  tanggal_surat date not null default current_date,
  isi jsonb not null,                   -- snapshot final (judul, pembuka, biodata, paragraf, penandatangan)
  diterbitkan_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nomor surat tidak boleh ganda (tidak peka huruf besar/kecil & spasi pinggir).
create unique index if not exists surat_terbit_nomor_unik
  on public.surat_terbit (lower(btrim(nomor_surat)));

alter table public.surat_terbit enable row level security;

-- Memuat NIK & data pribadi: hanya staf login yang boleh membaca.
drop policy if exists "Staf bisa lihat surat terbit" on public.surat_terbit;
create policy "Staf bisa lihat surat terbit"
  on public.surat_terbit for select to authenticated using (true);

-- Tulis: akses penuh saja (admin, sekdes, kaur, kasi). Kepala Desa hanya melihat.
drop policy if exists "Staf akses penuh bisa terbitkan surat" on public.surat_terbit;
create policy "Staf akses penuh bisa terbitkan surat"
  on public.surat_terbit for insert to authenticated
  with check (public.akses_tulis_penuh());

drop policy if exists "Staf akses penuh bisa ubah surat" on public.surat_terbit;
create policy "Staf akses penuh bisa ubah surat"
  on public.surat_terbit for update to authenticated
  using (public.akses_tulis_penuh()) with check (public.akses_tulis_penuh());

drop trigger if exists set_surat_terbit_updated_at on public.surat_terbit;
create trigger set_surat_terbit_updated_at
  before update on public.surat_terbit
  for each row execute procedure public.set_updated_at();

-- 3. Seed template awal (redaksi mengacu pada contoh surat desa) ------------------
-- Variabel: {{nama}} {{nik}} {{tempat_lahir}} {{tanggal_lahir}} {{ttl}}
-- {{jenis_kelamin}} {{agama}} {{pekerjaan}} {{status_kawin}} {{alamat}}
-- {{keperluan}} {{nama_desa}} {{jenis_wilayah}} {{kecamatan}} {{kabupaten}}
-- {{provinsi}} + key apa pun dari data_tambahan (mis. {{jenis_usaha}}).
-- Variabel yang kosong akan disorot kuning di editor supaya admin melengkapinya.
insert into public.template_surat (kode, nama, kata_kunci, judul, pembuka, biodata, isi, penutup)
values
('sktm', 'Surat Keterangan Tidak Mampu (SKTM)', array['tidak mampu','sktm'],
 'SURAT KETERANGAN TIDAK MAMPU',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, menerangkan bahwa:',
 '[{"label":"Nama","value":"{{nama}}"},{"label":"Tempat/Tanggal Lahir","value":"{{ttl}}"},{"label":"NIK","value":"{{nik}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin}}"},{"label":"Agama","value":"{{agama}}"},{"label":"Pekerjaan","value":"{{pekerjaan}}"},{"label":"Alamat","value":"{{alamat}}"}]',
 'Bahwa nama yang tercantum di atas adalah benar-benar berdomisili di {{jenis_wilayah}} {{nama_desa}}, Kecamatan {{kecamatan}}. Sepanjang pengamatan kami dan sesuai data yang ada dalam catatan kependudukan, orang tersebut di atas benar tergolong dalam keluarga prasejahtera (keluarga berpenghasilan rendah). Surat keterangan ini diberikan untuk {{keperluan}}.',
 'Demikian surat keterangan ini dibuat dengan sebenarnya dan diberikan kepada yang bersangkutan untuk dapat dipergunakan sebagaimana mestinya.'),

('domisili', 'Surat Keterangan Domisili', array['domisili'],
 'SURAT KETERANGAN DOMISILI',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, dengan ini menerangkan bahwa:',
 '[{"label":"Nama","value":"{{nama}}"},{"label":"NIK","value":"{{nik}}"},{"label":"Tempat/Tgl. Lahir","value":"{{ttl}}"},{"label":"Status","value":"{{status_kawin}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin}}"},{"label":"Agama","value":"{{agama}}"},{"label":"Pekerjaan","value":"{{pekerjaan}}"},{"label":"Alamat","value":"{{alamat}}"}]',
 'Menurut sepengetahuan kami bahwa yang namanya tersebut di atas memang benar warga berdomisili di {{alamat}} {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}.',
 'Demikianlah surat keterangan domisili ini kami buat, untuk dapat dipergunakan sebagaimana perlunya.'),

('usaha', 'Surat Keterangan Usaha', array['usaha'],
 'SURAT KETERANGAN USAHA',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, menerangkan dengan sebenar-benarnya bahwa:',
 '[{"label":"Nama","value":"{{nama}}"},{"label":"Tempat/Tanggal Lahir","value":"{{ttl}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin}}"},{"label":"Agama","value":"{{agama}}"},{"label":"Pekerjaan","value":"{{pekerjaan}}"},{"label":"Alamat","value":"{{alamat}}"}]',
 'Adalah benar yang bersangkutan warga {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}} yang memiliki usaha {{jenis_usaha}}.',
 'Demikian surat keterangan ini dibuat dan diberikan kepada yang bersangkutan untuk dapat digunakan sebagaimana mestinya.'),

('pengantar_skck', 'Surat Pengantar Catatan Kepolisian (SKCK)', array['skck','catatan kepolisian','kepolisian'],
 'SURAT PENGANTAR KETERANGAN CATATAN KEPOLISIAN',
 'Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, dengan ini menerangkan bahwa:',
 '[{"label":"Nama Lengkap","value":"{{nama}}"},{"label":"Jenis Kelamin","value":"{{jenis_kelamin}}"},{"label":"Tempat Tanggal Lahir","value":"{{ttl}}"},{"label":"Status Perkawinan","value":"{{status_kawin}}"},{"label":"Kewarganegaraan","value":"Indonesia"},{"label":"Agama","value":"{{agama}}"},{"label":"Pekerjaan","value":"{{pekerjaan}}"},{"label":"Nomor Induk Kependudukan","value":"{{nik}}"},{"label":"Alamat","value":"{{alamat}}"}]',
 'Orang tersebut di atas adalah benar penduduk {{jenis_wilayah}} kami yang berdomisili di alamat di atas serta kami menerangkan bahwa orang tersebut benar berkelakuan baik dan belum pernah tersangkut perkara Polisi. Surat keterangan ini kami berikan untuk memenuhi salah satu persyaratan {{keperluan}}.',
 'Demikian surat keterangan ini dibuat, kepada yang bersangkutan harap maklum serta menjadikan bahan seperlunya.')
on conflict (kode) do nothing;
