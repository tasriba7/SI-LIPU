-- 0060: Pilkades tahap C - rekap suara per calon per TPS, penetapan calon terpilih.
-- Idempotent. Prasyarat: 0051, 0052, 0054, 0055 sudah dijalankan.
--
-- PRINSIP:
--  * Yang dicatat hanya ANGKA hasil hitung per TPS (suara tiap calon + suara tidak sah).
--    Tidak ada data siapa memilih siapa (suara tetap rahasia).
--  * Baca: admin + panitia. Tulis: HANYA panitia, dan hanya lewat fungsi di bawah
--    (tidak ada INSERT/UPDATE/DELETE langsung dari API), sehingga selalu tercatat di Riwayat.
--  * Hanya calon berstatus "ditetapkan" yang bisa diberi suara.
--  * Jumlah suara sah + tidak sah di satu TPS tidak boleh melebihi jumlah pemilih yang
--    tercatat hadir di TPS itu (Daftar Hadir).
--  * Calon terpilih ditentukan OLEH DATABASE dari suara terbanyak; seri ditolak.
--    Setelah penetapan, suara terkunci. Pembatalan penetapan wajib alasan dan tercatat.
--  * Calon yang sudah punya suara tidak bisa dihapus, dan status/nomor urutnya dikunci.
--
-- ROLLBACK: drop table public.pilkades_hasil, public.pilkades_suara_tps, public.pilkades_suara cascade;
--           drop function public.pilkades_simpan_suara(uuid, uuid, jsonb, integer);
--           drop function public.pilkades_tetapkan_terpilih(uuid, date, text, text);
--           drop function public.pilkades_batalkan_penetapan(uuid, text);
--           drop trigger if exists pilkades_calon_kunci_suara on public.pilkades_calon;
--           drop function public.pilkades_calon_kunci_suara();

begin;

-- 1. Tabel ------------------------------------------------------------------
create table if not exists public.pilkades_suara (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  tps_id uuid not null references public.pilkades_tps(id) on delete restrict,
  calon_id uuid not null references public.pilkades_calon(id) on delete restrict,
  suara integer not null check (suara >= 0),
  unique (tps_id, calon_id)
);
create index if not exists pilkades_suara_periode_idx on public.pilkades_suara (periode_id);

-- Satu baris per TPS yang rekapnya sudah diinput (sekaligus menyimpan suara tidak sah).
create table if not exists public.pilkades_suara_tps (
  tps_id uuid primary key references public.pilkades_tps(id) on delete restrict,
  periode_id uuid not null references public.pilkades_periode(id) on delete cascade,
  suara_tidak_sah integer not null check (suara_tidak_sah >= 0),
  dicatat_oleh uuid references public.profiles(id) on delete set null,
  dicatat_oleh_nama text,
  dicatat_pada timestamptz not null default now()
);

-- Penetapan calon terpilih: paling banyak SATU per periode.
create table if not exists public.pilkades_hasil (
  periode_id uuid primary key references public.pilkades_periode(id) on delete cascade,
  calon_id uuid not null references public.pilkades_calon(id) on delete restrict,
  tanggal_penetapan date not null,
  nomor_berita_acara text,
  catatan text,
  suara_calon integer not null,
  suara_sah_total integer not null,
  suara_tidak_sah_total integer not null,
  ditetapkan_oleh uuid references public.profiles(id) on delete set null,
  ditetapkan_oleh_nama text,
  ditetapkan_pada timestamptz not null default now()
);

-- 2. Hak akses: hanya SELECT lewat API ----------------------------------------
revoke all on public.pilkades_suara, public.pilkades_suara_tps, public.pilkades_hasil
  from public, anon, authenticated;
grant select on public.pilkades_suara, public.pilkades_suara_tps, public.pilkades_hasil
  to authenticated;

alter table public.pilkades_suara     enable row level security;
alter table public.pilkades_suara_tps enable row level security;
alter table public.pilkades_hasil     enable row level security;

drop policy if exists "pilkades_suara_lihat" on public.pilkades_suara;
create policy "pilkades_suara_lihat" on public.pilkades_suara
  for select to authenticated using (public.boleh_lihat_pilkades());
drop policy if exists "pilkades_suara_tps_lihat" on public.pilkades_suara_tps;
create policy "pilkades_suara_tps_lihat" on public.pilkades_suara_tps
  for select to authenticated using (public.boleh_lihat_pilkades());
drop policy if exists "pilkades_hasil_lihat" on public.pilkades_hasil;
create policy "pilkades_hasil_lihat" on public.pilkades_hasil
  for select to authenticated using (public.boleh_lihat_pilkades());

-- 3. Simpan rekap satu TPS --------------------------------------------------------
-- p_suara: objek JSON { "<id calon>": jumlah, ... } untuk SEMUA calon yang ditetapkan.
create or replace function public.pilkades_simpan_suara(
  p_periode uuid, p_tps uuid, p_suara jsonb, p_tidak_sah integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_tps public.pilkades_tps%rowtype;
  v_calon record;
  v_nilai integer;
  v_sah integer := 0;
  v_hadir integer;
  v_ringkas text := '';
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if exists (select 1 from public.pilkades_hasil where periode_id = p_periode) then
    raise exception 'Calon terpilih sudah ditetapkan. Batalkan penetapan dulu bila suara perlu diubah.';
  end if;

  select * into v_tps from public.pilkades_tps where id = p_tps and periode_id = p_periode;
  if not found then
    raise exception 'TPS tidak ditemukan';
  end if;
  if p_tidak_sah is null or p_tidak_sah < 0 then
    raise exception 'Suara tidak sah harus berupa angka 0 atau lebih';
  end if;
  if p_suara is null or jsonb_typeof(p_suara) <> 'object' then
    raise exception 'Data suara tidak valid';
  end if;
  if not exists (select 1 from public.pilkades_calon where periode_id = p_periode and status = 'ditetapkan') then
    raise exception 'Belum ada calon yang ditetapkan';
  end if;

  -- Tidak boleh ada kunci selain calon yang ditetapkan di periode ini.
  if exists (
    select 1 from jsonb_object_keys(p_suara) k
    where k not in (select id::text from public.pilkades_calon
                    where periode_id = p_periode and status = 'ditetapkan')
  ) then
    raise exception 'Ada calon yang tidak valid';
  end if;

  for v_calon in
    select id, nomor_urut from public.pilkades_calon
    where periode_id = p_periode and status = 'ditetapkan'
    order by nomor_urut
  loop
    if not (p_suara ? v_calon.id::text) then
      raise exception 'Suara calon nomor % belum diisi (isi 0 bila tidak ada)', v_calon.nomor_urut;
    end if;
    begin
      v_nilai := (p_suara ->> v_calon.id::text)::integer;
    exception when others then
      raise exception 'Suara calon nomor % harus berupa angka bulat', v_calon.nomor_urut;
    end;
    if v_nilai is null or v_nilai < 0 then
      raise exception 'Suara calon nomor % harus 0 atau lebih', v_calon.nomor_urut;
    end if;
    v_sah := v_sah + v_nilai;
  end loop;

  -- Surat suara yang dihitung tidak boleh melebihi pemilih yang hadir di TPS ini.
  select count(*) into v_hadir from public.pilkades_hadir
  where periode_id = p_periode and tps_nama = v_tps.nama;
  if v_sah + p_tidak_sah > v_hadir then
    raise exception 'Jumlah suara (% sah + % tidak sah) melebihi pemilih yang tercatat hadir di % (%). Periksa angka atau Daftar Hadir.',
      v_sah, p_tidak_sah, v_tps.nama, v_hadir;
  end if;

  delete from public.pilkades_suara where tps_id = p_tps;
  for v_calon in
    select id, nomor_urut from public.pilkades_calon
    where periode_id = p_periode and status = 'ditetapkan'
    order by nomor_urut
  loop
    v_nilai := (p_suara ->> v_calon.id::text)::integer;
    insert into public.pilkades_suara (periode_id, tps_id, calon_id, suara)
    values (p_periode, p_tps, v_calon.id, v_nilai);
    v_ringkas := v_ringkas || ' no.' || v_calon.nomor_urut || '=' || v_nilai;
  end loop;

  insert into public.pilkades_suara_tps (tps_id, periode_id, suara_tidak_sah, dicatat_oleh, dicatat_oleh_nama, dicatat_pada)
  values (p_tps, p_periode, p_tidak_sah, auth.uid(),
          (select nama from public.profiles where id = auth.uid()), now())
  on conflict (tps_id) do update
    set suara_tidak_sah = excluded.suara_tidak_sah,
        dicatat_oleh = excluded.dicatat_oleh,
        dicatat_oleh_nama = excluded.dicatat_oleh_nama,
        dicatat_pada = excluded.dicatat_pada;

  perform public.pilkades_catat(
    p_periode, 'simpan_suara',
    v_tps.nama || ':' || v_ringkas || ', tidak sah=' || p_tidak_sah || ', hadir=' || v_hadir
  );
end;
$$;

-- 4. Tetapkan calon terpilih (ditentukan database dari suara terbanyak) ---------------
create or replace function public.pilkades_tetapkan_terpilih(
  p_periode uuid, p_tanggal date, p_nomor text, p_catatan text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_jml_tps integer;
  v_jml_rekap integer;
  v_jml_calon integer;
  v_menang record;
  v_kedua integer;
  v_sah integer;
  v_tidak_sah integer;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal penetapan wajib diisi';
  end if;
  if exists (select 1 from public.pilkades_hasil where periode_id = p_periode) then
    raise exception 'Calon terpilih sudah ditetapkan';
  end if;

  select count(*) into v_jml_tps from public.pilkades_tps where periode_id = p_periode;
  select count(*) into v_jml_rekap from public.pilkades_suara_tps where periode_id = p_periode;
  if v_jml_tps = 0 then
    raise exception 'Belum ada TPS';
  end if;
  if v_jml_rekap < v_jml_tps then
    raise exception 'Rekap suara belum lengkap: % dari % TPS sudah diisi', v_jml_rekap, v_jml_tps;
  end if;

  select count(*) into v_jml_calon
  from public.pilkades_calon where periode_id = p_periode and status = 'ditetapkan';
  if v_jml_calon < 1 then
    raise exception 'Belum ada calon yang ditetapkan';
  end if;

  -- Total suara per calon yang ditetapkan, terbanyak dulu.
  select t.calon_id, t.total into v_menang
  from (
    select c.id as calon_id, coalesce(sum(s.suara), 0)::integer as total
    from public.pilkades_calon c
    left join public.pilkades_suara s on s.calon_id = c.id
    where c.periode_id = p_periode and c.status = 'ditetapkan'
    group by c.id
  ) t
  order by t.total desc, t.calon_id limit 1;

  select t.total into v_kedua
  from (
    select c.id as calon_id, coalesce(sum(s.suara), 0)::integer as total
    from public.pilkades_calon c
    left join public.pilkades_suara s on s.calon_id = c.id
    where c.periode_id = p_periode and c.status = 'ditetapkan'
    group by c.id
  ) t
  order by t.total desc, t.calon_id offset 1 limit 1;

  select coalesce(sum(suara), 0)::integer into v_sah
  from public.pilkades_suara where periode_id = p_periode;
  if v_sah = 0 then
    raise exception 'Belum ada suara sah';
  end if;
  if v_kedua is not null and v_kedua = v_menang.total then
    raise exception 'Suara terbanyak seri. Aplikasi tidak menetapkan otomatis; ikuti ketentuan daerah (mis. pemilihan ulang).';
  end if;

  select coalesce(sum(suara_tidak_sah), 0) into v_tidak_sah
  from public.pilkades_suara_tps where periode_id = p_periode;

  insert into public.pilkades_hasil
    (periode_id, calon_id, tanggal_penetapan, nomor_berita_acara, catatan,
     suara_calon, suara_sah_total, suara_tidak_sah_total, ditetapkan_oleh, ditetapkan_oleh_nama)
  values
    (p_periode, v_menang.calon_id, p_tanggal, nullif(left(trim(coalesce(p_nomor, '')), 100), ''),
     nullif(left(trim(coalesce(p_catatan, '')), 300), ''),
     v_menang.total, v_sah, v_tidak_sah, auth.uid(),
     (select nama from public.profiles where id = auth.uid()));

  perform public.pilkades_catat(
    p_periode, 'tetapkan_terpilih',
    (select 'No. ' || nomor_urut || ' ' || nama from public.pilkades_calon where id = v_menang.calon_id)
    || ' - ' || v_menang.total || ' dari ' || v_sah || ' suara sah'
  );
  return v_menang.calon_id;
end;
$$;

-- 5. Batalkan penetapan (wajib alasan, tercatat) ----------------------------------------
create or replace function public.pilkades_batalkan_penetapan(p_periode uuid, p_alasan text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_nama text;
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Hanya Panitia Pilkades yang dapat membatalkan';
  end if;
  if p_alasan is null or length(trim(p_alasan)) < 5 then
    raise exception 'Alasan wajib diisi';
  end if;
  delete from public.pilkades_hasil where periode_id = p_periode returning calon_id::text into v_nama;
  if v_nama is null then
    raise exception 'Belum ada penetapan calon terpilih';
  end if;
  perform public.pilkades_catat(p_periode, 'batal_penetapan', trim(p_alasan));
end;
$$;

-- 6. Kunci calon yang sudah punya suara --------------------------------------------------
create or replace function public.pilkades_calon_kunci_suara()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.pilkades_suara where calon_id = old.id)
     and (new.status <> 'ditetapkan' or new.nomor_urut is distinct from old.nomor_urut) then
    raise exception 'Calon ini sudah punya data suara. Status dan nomor urut tidak bisa diubah.';
  end if;
  return new;
end;
$$;
drop trigger if exists pilkades_calon_kunci_suara on public.pilkades_calon;
create trigger pilkades_calon_kunci_suara
  before update on public.pilkades_calon
  for each row execute function public.pilkades_calon_kunci_suara();

revoke execute on function public.pilkades_simpan_suara(uuid, uuid, jsonb, integer)   from public, anon;
revoke execute on function public.pilkades_tetapkan_terpilih(uuid, date, text, text)  from public, anon;
revoke execute on function public.pilkades_batalkan_penetapan(uuid, text)             from public, anon;
grant  execute on function public.pilkades_simpan_suara(uuid, uuid, jsonb, integer)   to authenticated;
grant  execute on function public.pilkades_tetapkan_terpilih(uuid, date, text, text)  to authenticated;
grant  execute on function public.pilkades_batalkan_penetapan(uuid, text)             to authenticated;

commit;
