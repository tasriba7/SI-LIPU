-- 0033: MUTASI PENDUDUK TAHAP 2 - pindah keluar, penduduk datang, ringkasan per bulan.
-- Jalankan SETELAH 0032 (Supabase Dashboard -> SQL Editor -> New query -> Run),
-- dan SEBELUM men-deploy kode aplikasi tahap 2. Aman dijalankan ulang (idempotent).
-- Tidak mengubah atau menghapus data warga/mutasi yang sudah ada.
--
-- ISI:
--   1. Kolom mutasi_penduduk.asal_tujuan (tujuan pindah / asal kedatangan)
--   2. catat_pindah_keluar(): satu atau beberapa anggota keluarga pindah keluar
--   3. catat_datang(): penduduk baru datang, atau penduduk lama yang pernah
--      pindah keluar datang kembali (boleh campuran dalam satu keluarga)
--   4. batalkan_mutasi(): diperluas untuk 'pindah_keluar' dan 'datang'
--   5. ringkasan_mutasi_bulanan(): jumlah mutasi per bulan (mengikuti RLS)
--
-- Hak akses sama dengan tandai_meninggal(): Administrator, Sekretaris Desa,
-- Kaur, Kasi. Pembatalan: hanya Administrator.

begin;

-- 1. Kolom tambahan --------------------------------------------------------------
alter table public.mutasi_penduduk
  add column if not exists asal_tujuan text;

-- 2. Pindah keluar -----------------------------------------------------------------
create or replace function public.catat_pindah_keluar(
  p_warga_ids uuid[],
  p_tanggal date,
  p_tujuan text default null,
  p_keterangan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_w public.warga%rowtype;
  v_nama text;
  v_tujuan text := nullif(left(btrim(coalesce(p_tujuan, '')), 200), '');
  v_ket text := nullif(left(btrim(coalesce(p_keterangan, '')), 300), '');
  v_ids uuid[];
  v_nama_list text[] := '{}';
  v_kepala boolean := false;
  v_kk_kepala text := null;
  v_sisa integer := 0;
begin
  if auth.uid() is null or not public.akses_tulis_penuh() then
    raise exception 'Hanya Administrator, Sekretaris Desa, Kaur, atau Kasi yang boleh mengubah status penduduk.'
      using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct x order by x), '{}') into v_ids
  from unnest(coalesce(p_warga_ids, '{}'::uuid[])) as x
  where x is not null;

  if cardinality(v_ids) = 0 then
    raise exception 'Pilih minimal 1 penduduk yang pindah.' using errcode = 'P0001';
  end if;
  if cardinality(v_ids) > 20 then
    raise exception 'Maksimal 20 orang per pencatatan.' using errcode = 'P0001';
  end if;
  if p_tanggal is null or p_tanggal > current_date then
    raise exception 'Tanggal pindah tidak valid (tidak boleh kosong atau di masa depan).'
      using errcode = 'P0001';
  end if;

  select coalesce(p.nama, 'Tidak diketahui') into v_nama
  from public.profiles p where p.id = auth.uid();

  foreach v_id in array v_ids loop
    select * into v_w from public.warga where id = v_id for update;
    if not found then
      raise exception 'Data penduduk tidak ditemukan.' using errcode = 'P0001';
    end if;
    if v_w.status_kependudukan <> 'aktif' then
      raise exception '% sudah berstatus % di data penduduk.',
        v_w.nama_lengkap,
        case v_w.status_kependudukan when 'meninggal' then 'meninggal' else 'pindah keluar' end
        using errcode = 'P0001';
    end if;
    if p_tanggal < v_w.tanggal_lahir then
      raise exception 'Tanggal pindah % tidak boleh sebelum tanggal lahir (%).',
        v_w.nama_lengkap, v_w.tanggal_lahir
        using errcode = 'P0001';
    end if;

    perform set_config('app.mutasi_warga', '1', true);
    update public.warga
      set status_kependudukan = 'pindah', tanggal_status = p_tanggal
      where id = v_id;
    perform set_config('app.mutasi_warga', '', true);

    insert into public.mutasi_penduduk
      (warga_id, jenis, tanggal, keterangan, asal_tujuan, dicatat_oleh, dicatat_oleh_nama)
    values
      (v_id, 'pindah_keluar', p_tanggal, v_ket, v_tujuan, auth.uid(), v_nama);

    v_nama_list := v_nama_list || v_w.nama_lengkap;
    if v_w.status_dalam_kk = 'Kepala Keluarga' and coalesce(v_w.no_kk, '') <> '' then
      v_kepala := true;
      v_kk_kepala := v_w.no_kk;
    end if;
  end loop;

  if v_kepala then
    select count(*) into v_sisa from public.warga
    where no_kk = v_kk_kepala and status_kependudukan = 'aktif';
  end if;

  return jsonb_build_object(
    'ok', true,
    'jumlah', cardinality(v_ids),
    'nama', to_jsonb(v_nama_list),
    'kepala_keluarga', v_kepala,
    'sisa_anggota', v_sisa
  );
end;
$$;

-- 3. Datang --------------------------------------------------------------------------
-- p_anggota: array JSON. Tiap elemen salah satu dari:
--   {"warga_id": "<uuid>"}  -> penduduk lama berstatus 'pindah' datang kembali
--   {"nik":..., "nama_lengkap":..., "tanggal_lahir":"yyyy-mm-dd", ...} -> penduduk baru
-- Alamat/No. KK keluarga (p_no_kk, p_alamat, p_dusun, p_rt, p_rw) berlaku untuk semua.
create or replace function public.catat_datang(
  p_tanggal date,
  p_asal text,
  p_keterangan text,
  p_no_kk text,
  p_alamat text,
  p_dusun text,
  p_rt text,
  p_rw text,
  p_anggota jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e jsonb;
  v_wid uuid;
  v_w public.warga%rowtype;
  v_ada public.warga%rowtype;
  v_nama text;
  v_asal text := nullif(left(btrim(coalesce(p_asal, '')), 200), '');
  v_ket text := nullif(left(btrim(coalesce(p_keterangan, '')), 300), '');
  v_kk text := nullif(btrim(coalesce(p_no_kk, '')), '');
  v_alamat text := nullif(btrim(coalesce(p_alamat, '')), '');
  v_dusun text := nullif(btrim(coalesce(p_dusun, '')), '');
  v_rt text := nullif(btrim(coalesce(p_rt, '')), '');
  v_rw text := nullif(btrim(coalesce(p_rw, '')), '');
  v_nik text;
  v_nm text;
  v_lahir date;
  v_pindah_terakhir date;
  v_nama_list text[] := '{}';
  v_baru integer := 0;
  v_kembali integer := 0;
  v_i integer := 0;
begin
  if auth.uid() is null or not public.akses_tulis_penuh() then
    raise exception 'Hanya Administrator, Sekretaris Desa, Kaur, atau Kasi yang boleh mengubah status penduduk.'
      using errcode = 'P0001';
  end if;

  if p_anggota is null or jsonb_typeof(p_anggota) <> 'array' or jsonb_array_length(p_anggota) = 0 then
    raise exception 'Minimal isi 1 penduduk yang datang.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_anggota) > 20 then
    raise exception 'Maksimal 20 orang per pencatatan.' using errcode = 'P0001';
  end if;
  if p_tanggal is null or p_tanggal > current_date then
    raise exception 'Tanggal datang tidak valid (tidak boleh kosong atau di masa depan).'
      using errcode = 'P0001';
  end if;
  if v_kk is not null and v_kk !~ '^\d{16}$' then
    raise exception 'No. KK harus 16 digit angka (atau kosongkan).' using errcode = 'P0001';
  end if;

  select coalesce(p.nama, 'Tidak diketahui') into v_nama
  from public.profiles p where p.id = auth.uid();

  for v_e in select value from jsonb_array_elements(p_anggota) loop
    v_i := v_i + 1;

    if nullif(btrim(coalesce(v_e->>'warga_id', '')), '') is not null then
      -- ---- Datang kembali: penduduk lama berstatus pindah ----
      begin
        v_wid := (v_e->>'warga_id')::uuid;
      exception when invalid_text_representation then
        raise exception 'Anggota ke-%: data penduduk tidak valid.', v_i using errcode = 'P0001';
      end;

      select * into v_w from public.warga where id = v_wid for update;
      if not found then
        raise exception 'Anggota ke-%: data penduduk tidak ditemukan.', v_i using errcode = 'P0001';
      end if;
      if v_w.status_kependudukan = 'aktif' then
        raise exception '% sudah berstatus aktif di data penduduk.', v_w.nama_lengkap
          using errcode = 'P0001';
      end if;
      if v_w.status_kependudukan = 'meninggal' then
        raise exception '% tercatat meninggal, tidak bisa dicatat datang.', v_w.nama_lengkap
          using errcode = 'P0001';
      end if;
      if p_tanggal < v_w.tanggal_lahir then
        raise exception 'Tanggal datang % tidak boleh sebelum tanggal lahir (%).',
          v_w.nama_lengkap, v_w.tanggal_lahir using errcode = 'P0001';
      end if;

      select max(tanggal) into v_pindah_terakhir
      from public.mutasi_penduduk
      where warga_id = v_wid and jenis = 'pindah_keluar' and dibatalkan_pada is null;
      if v_pindah_terakhir is not null and p_tanggal < v_pindah_terakhir then
        raise exception 'Tanggal datang % tidak boleh sebelum tanggal pindah keluarnya (%).',
          v_w.nama_lengkap, v_pindah_terakhir using errcode = 'P0001';
      end if;

      perform set_config('app.mutasi_warga', '1', true);
      update public.warga
        set status_kependudukan = 'aktif',
            tanggal_status = null,
            no_kk = coalesce(v_kk, no_kk),
            alamat = coalesce(v_alamat, alamat),
            dusun = coalesce(v_dusun, dusun),
            rt = coalesce(v_rt, rt),
            rw = coalesce(v_rw, rw),
            status_dalam_kk = coalesce(nullif(btrim(coalesce(v_e->>'status_dalam_kk', '')), ''), status_dalam_kk)
        where id = v_wid;
      perform set_config('app.mutasi_warga', '', true);

      insert into public.mutasi_penduduk
        (warga_id, jenis, tanggal, keterangan, asal_tujuan, dicatat_oleh, dicatat_oleh_nama)
      values
        (v_wid, 'datang', p_tanggal, v_ket, v_asal, auth.uid(), v_nama);

      v_nama_list := v_nama_list || v_w.nama_lengkap;
      v_kembali := v_kembali + 1;
    else
      -- ---- Penduduk baru ----
      v_nik := btrim(coalesce(v_e->>'nik', ''));
      v_nm := btrim(coalesce(v_e->>'nama_lengkap', ''));
      if v_nik = '' or v_nm = '' or nullif(btrim(coalesce(v_e->>'tanggal_lahir', '')), '') is null then
        raise exception 'Anggota ke-%: NIK, nama lengkap, dan tanggal lahir wajib diisi.', v_i
          using errcode = 'P0001';
      end if;
      if v_nik !~ '^\d{16}$' then
        raise exception 'Anggota ke-%: NIK harus 16 digit angka.', v_i using errcode = 'P0001';
      end if;
      begin
        v_lahir := (v_e->>'tanggal_lahir')::date;
      exception when others then
        raise exception 'Anggota ke-%: tanggal lahir tidak valid.', v_i using errcode = 'P0001';
      end;
      if v_lahir > p_tanggal then
        raise exception 'Anggota ke-%: tanggal lahir tidak boleh setelah tanggal datang.', v_i
          using errcode = 'P0001';
      end if;
      if nullif(btrim(coalesce(v_e->>'jenis_kelamin', '')), '') is not null
         and (v_e->>'jenis_kelamin') not in ('L', 'P') then
        raise exception 'Anggota ke-%: jenis kelamin harus L atau P.', v_i using errcode = 'P0001';
      end if;

      select * into v_ada from public.warga where nik = v_nik;
      if found then
        if v_ada.status_kependudukan = 'pindah' then
          raise exception 'NIK % (%) sudah ada di data dengan status pindah keluar. Gunakan "Datang kembali", bukan penduduk baru.',
            v_nik, v_ada.nama_lengkap using errcode = 'P0001';
        elsif v_ada.status_kependudukan = 'meninggal' then
          raise exception 'NIK % (%) tercatat meninggal di data penduduk.', v_nik, v_ada.nama_lengkap
            using errcode = 'P0001';
        else
          raise exception 'NIK % (%) sudah terdaftar dan berstatus aktif di data kependudukan.',
            v_nik, v_ada.nama_lengkap using errcode = 'P0001';
        end if;
      end if;

      insert into public.warga
        (nik, no_kk, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin,
         alamat, dusun, rt, rw, no_hp, status_kawin, status_dalam_kk,
         pekerjaan, agama, pendidikan)
      values
        (v_nik, v_kk, v_nm,
         nullif(btrim(coalesce(v_e->>'tempat_lahir', '')), ''),
         v_lahir,
         nullif(btrim(coalesce(v_e->>'jenis_kelamin', '')), ''),
         v_alamat, v_dusun, v_rt, v_rw,
         nullif(btrim(coalesce(v_e->>'no_hp', '')), ''),
         nullif(btrim(coalesce(v_e->>'status_kawin', '')), ''),
         nullif(btrim(coalesce(v_e->>'status_dalam_kk', '')), ''),
         nullif(btrim(coalesce(v_e->>'pekerjaan', '')), ''),
         nullif(btrim(coalesce(v_e->>'agama', '')), ''),
         nullif(btrim(coalesce(v_e->>'pendidikan', '')), ''))
      returning id into v_wid;

      insert into public.mutasi_penduduk
        (warga_id, jenis, tanggal, keterangan, asal_tujuan, dicatat_oleh, dicatat_oleh_nama)
      values
        (v_wid, 'datang', p_tanggal, v_ket, v_asal, auth.uid(), v_nama);

      v_nama_list := v_nama_list || v_nm;
      v_baru := v_baru + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'jumlah', v_baru + v_kembali,
    'baru', v_baru,
    'kembali', v_kembali,
    'nama', to_jsonb(v_nama_list)
  );
end;
$$;

-- 4. Pembatalan (Administrator) -- menggantikan versi 0032 ----------------------------
create or replace function public.batalkan_mutasi(p_mutasi_id uuid, p_alasan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.mutasi_penduduk%rowtype;
  v_w public.warga%rowtype;
  v_nama text;
  v_tgl_pindah date;
begin
  if auth.uid() is null or not public.adalah_admin() then
    raise exception 'Pembatalan mutasi hanya bisa dilakukan oleh Administrator.'
      using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_alasan, ''))) < 3 then
    raise exception 'Alasan pembatalan wajib diisi.' using errcode = 'P0001';
  end if;

  select * into v_m from public.mutasi_penduduk where id = p_mutasi_id for update;
  if not found then
    raise exception 'Catatan mutasi tidak ditemukan.' using errcode = 'P0001';
  end if;
  if v_m.dibatalkan_pada is not null then
    raise exception 'Catatan mutasi ini sudah dibatalkan sebelumnya.' using errcode = 'P0001';
  end if;
  if v_m.jenis not in ('meninggal', 'pindah_keluar', 'datang') then
    raise exception 'Jenis mutasi ini belum bisa dibatalkan dari sini.' using errcode = 'P0001';
  end if;

  select * into v_w from public.warga where id = v_m.warga_id for update;
  if not found then
    raise exception 'Data penduduk tidak ditemukan.' using errcode = 'P0001';
  end if;

  select coalesce(p.nama, 'Tidak diketahui') into v_nama
  from public.profiles p where p.id = auth.uid();

  if v_m.jenis = 'meninggal' then
    if v_w.status_kependudukan <> 'meninggal' then
      raise exception 'Status % sudah berubah, catatan ini tidak bisa dibatalkan.', v_w.nama_lengkap
        using errcode = 'P0001';
    end if;
    perform set_config('app.mutasi_warga', '1', true);
    update public.warga
      set status_kependudukan = 'aktif', tanggal_status = null
      where id = v_m.warga_id;
    perform set_config('app.mutasi_warga', '', true);

  elsif v_m.jenis = 'pindah_keluar' then
    if v_w.status_kependudukan <> 'pindah' then
      raise exception '% sudah tercatat aktif lagi (datang kembali). Batalkan catatan datangnya terlebih dahulu.',
        v_w.nama_lengkap using errcode = 'P0001';
    end if;
    -- Bisa ditolak trigger Kepala Keluarga bila KK itu sudah punya kepala baru.
    perform set_config('app.mutasi_warga', '1', true);
    update public.warga
      set status_kependudukan = 'aktif', tanggal_status = null
      where id = v_m.warga_id;
    perform set_config('app.mutasi_warga', '', true);

  else
    -- 'datang': penduduk dikeluarkan lagi dari jumlah penduduk (status 'pindah').
    if v_w.status_kependudukan <> 'aktif' then
      raise exception 'Status % sudah berubah, catatan datang ini tidak bisa dibatalkan.', v_w.nama_lengkap
        using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.mutasi_penduduk
      where warga_id = v_m.warga_id and id <> v_m.id
        and dibatalkan_pada is null and created_at > v_m.created_at
    ) then
      raise exception 'Ada catatan mutasi lain yang lebih baru untuk %. Batalkan yang terbaru terlebih dahulu.',
        v_w.nama_lengkap using errcode = 'P0001';
    end if;
    select max(tanggal) into v_tgl_pindah
    from public.mutasi_penduduk
    where warga_id = v_m.warga_id and jenis = 'pindah_keluar'
      and dibatalkan_pada is null and id <> v_m.id;
    perform set_config('app.mutasi_warga', '1', true);
    update public.warga
      set status_kependudukan = 'pindah', tanggal_status = v_tgl_pindah
      where id = v_m.warga_id;
    perform set_config('app.mutasi_warga', '', true);
  end if;

  update public.mutasi_penduduk
    set dibatalkan_pada = now(),
        dibatalkan_oleh = auth.uid(),
        dibatalkan_oleh_nama = v_nama,
        alasan_batal = left(btrim(p_alasan), 300)
    where id = v_m.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- 5. Ringkasan per bulan (SECURITY INVOKER: ikut RLS, Kadus/RT hanya wilayahnya) ----------
create or replace function public.ringkasan_mutasi_bulanan(p_tahun integer)
returns table (
  bulan integer,
  jenis text,
  jumlah bigint,
  laki bigint,
  perempuan bigint
)
language sql
stable
set search_path = public
as $$
  select
    extract(month from m.tanggal)::integer as bulan,
    m.jenis,
    count(*) as jumlah,
    count(*) filter (where w.jenis_kelamin = 'L') as laki,
    count(*) filter (where w.jenis_kelamin = 'P') as perempuan
  from public.mutasi_penduduk m
  join public.warga w on w.id = m.warga_id
  where m.dibatalkan_pada is null
    and m.tanggal >= make_date(p_tahun, 1, 1)
    and m.tanggal < make_date(p_tahun + 1, 1, 1)
  group by 1, 2
  order by 1, 2;
$$;

-- Hak eksekusi ------------------------------------------------------------------------
revoke execute on function public.catat_pindah_keluar(uuid[], date, text, text) from public, anon;
revoke execute on function public.catat_datang(date, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.batalkan_mutasi(uuid, text) from public, anon;
revoke execute on function public.ringkasan_mutasi_bulanan(integer) from public, anon;
grant execute on function public.catat_pindah_keluar(uuid[], date, text, text) to authenticated;
grant execute on function public.catat_datang(date, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.batalkan_mutasi(uuid, text) to authenticated;
grant execute on function public.ringkasan_mutasi_bulanan(integer) to authenticated;

commit;
