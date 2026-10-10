-- Faktor ketiga verifikasi warga: TEBAK TEMPAT LAHIR (pilihan bertanda inisial).
-- Jalankan SETELAH 0041.
--
-- Setelah NIK + tanggal lahir cocok, warga diminta memilih tempat lahirnya dari
-- beberapa pilihan yang disamarkan (mis. "Tatakalai" -> "T***K***I").
-- Salah memilih 3 kali -> pencarian dibatalkan dan dikunci 24 jam untuk warga itu.
--
-- Tabel ini hanya mencatat percobaan (tanpa isi jawaban). Penghitungan dilakukan
-- di server (lib/verifikasiTempatLahir.js) dengan service_role; RLS aktif tanpa
-- policy dan semua hak anon/authenticated dicabut, sama seperti
-- bukti_verifikasi_terpakai (migrasi 0028).

create table if not exists public.percobaan_tempat_lahir (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga(id) on delete cascade,
  identifier text not null,            -- IP pemohon, diisi server (bukan dari klien)
  berhasil boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists percobaan_tl_warga_idx
  on public.percobaan_tempat_lahir (warga_id, created_at);
create index if not exists percobaan_tl_identifier_idx
  on public.percobaan_tempat_lahir (identifier, created_at);

alter table public.percobaan_tempat_lahir enable row level security;
revoke all on table public.percobaan_tempat_lahir from anon, authenticated;

-- Admin boleh membaca untuk audit (siapa yang sering gagal menebak).
drop policy if exists "Admin bisa baca percobaan tempat lahir" on public.percobaan_tempat_lahir;
create policy "Admin bisa baca percobaan tempat lahir"
  on public.percobaan_tempat_lahir for select to authenticated
  using (public.adalah_admin());
grant select on table public.percobaan_tempat_lahir to authenticated;
