-- Verifikasi 0055. Hanya MEMBACA.
-- 1. Kebijakan tulis (cmd bukan SELECT) tidak boleh memakai boleh_lihat_pilkades / adalah_admin
--    kecuali pilkades_periode_tulis (admin). Harus: calon_tulis, tps_tulis, pemilih_ubah -> boleh_kelola_pilkades.
select tablename, policyname, cmd, qual
from pg_policies
where tablename like 'pilkades_%' and cmd <> 'SELECT'
order by 1, 2;

-- 2. Fungsi akses ada (3 baris)
select proname from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('boleh_lihat_pilkades', 'boleh_kelola_pilkades', 'pilkades_batal_hadir') order by 1;
