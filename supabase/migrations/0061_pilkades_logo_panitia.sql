-- 0061: Pilkades - logo panitia (tampil di kop dokumen cetak panitia).
-- Idempotent. Prasyarat: 0051, 0052, 0055 sudah dijalankan.
--
-- PRINSIP:
--  * Logo disimpan di bucket PRIVAT 'pilkades-logo' (path: <id periode>/logo-<waktu>.<ext>).
--    Tampil lewat signed URL berumur 1 jam, hanya untuk admin + panitia yang login.
--  * Satu logo per periode. Unggah/ganti/hapus: HANYA panitia, dan pencatatan di tabel
--    hanya lewat fungsi (tercatat di Riwayat). Admin hanya melihat.
--
-- ROLLBACK: drop table public.pilkades_logo;
--           drop function public.pilkades_simpan_logo(uuid, text);
--           delete dari storage.objects where bucket_id = 'pilkades-logo', lalu hapus bucket-nya.

begin;

create table if not exists public.pilkades_logo (
  periode_id uuid primary key references public.pilkades_periode(id) on delete cascade,
  logo_path text not null,
  diubah_oleh uuid references public.profiles(id) on delete set null,
  diubah_oleh_nama text,
  diubah_pada timestamptz not null default now()
);

revoke all on public.pilkades_logo from public, anon, authenticated;
grant select on public.pilkades_logo to authenticated;
alter table public.pilkades_logo enable row level security;
drop policy if exists "pilkades_logo_lihat" on public.pilkades_logo;
create policy "pilkades_logo_lihat" on public.pilkades_logo
  for select to authenticated using (public.boleh_lihat_pilkades());

-- Bucket privat + aturan akses berkas.
insert into storage.buckets (id, name, public)
values ('pilkades-logo', 'pilkades-logo', false)
on conflict (id) do nothing;

drop policy if exists "Pilkades lihat logo" on storage.objects;
create policy "Pilkades lihat logo"
  on storage.objects for select to authenticated
  using (bucket_id = 'pilkades-logo' and public.boleh_lihat_pilkades());

drop policy if exists "Panitia unggah logo" on storage.objects;
create policy "Panitia unggah logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pilkades-logo' and public.boleh_kelola_pilkades());

drop policy if exists "Panitia ubah logo" on storage.objects;
create policy "Panitia ubah logo"
  on storage.objects for update to authenticated
  using (bucket_id = 'pilkades-logo' and public.boleh_kelola_pilkades())
  with check (bucket_id = 'pilkades-logo' and public.boleh_kelola_pilkades());

drop policy if exists "Panitia hapus logo" on storage.objects;
create policy "Panitia hapus logo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pilkades-logo' and public.boleh_kelola_pilkades());

-- Simpan/ganti logo (p_path = lokasi berkas di bucket), atau hapus (p_path null).
create or replace function public.pilkades_simpan_logo(p_periode uuid, p_path text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.boleh_kelola_pilkades() then
    raise exception 'Tidak berwenang';
  end if;
  if not exists (select 1 from public.pilkades_periode where id = p_periode) then
    raise exception 'Periode tidak ditemukan';
  end if;

  if p_path is null then
    delete from public.pilkades_logo where periode_id = p_periode;
    perform public.pilkades_catat(p_periode, 'ubah_logo', 'Logo panitia dihapus');
    return;
  end if;

  if p_path !~ ('^' || p_periode::text || '/logo-[0-9]+\.(png|jpg|jpeg|webp)$') then
    raise exception 'Lokasi berkas logo tidak valid';
  end if;

  insert into public.pilkades_logo (periode_id, logo_path, diubah_oleh, diubah_oleh_nama, diubah_pada)
  values (p_periode, p_path, auth.uid(), (select nama from public.profiles where id = auth.uid()), now())
  on conflict (periode_id) do update
    set logo_path = excluded.logo_path, diubah_oleh = excluded.diubah_oleh,
        diubah_oleh_nama = excluded.diubah_oleh_nama, diubah_pada = excluded.diubah_pada;

  perform public.pilkades_catat(p_periode, 'ubah_logo', 'Logo panitia diganti');
end;
$$;

revoke execute on function public.pilkades_simpan_logo(uuid, text) from public, anon;
grant  execute on function public.pilkades_simpan_logo(uuid, text) to authenticated;

commit;
