import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { Pesan } from "@/components/pilkades/UI";

// Modul Pilkades: hanya Administrator dan Panitia Pilkades.
// Pemberitahuan "hanya melihat" untuk Administrator cukup tampil SATU kali di sini,
// tidak diulang di tiap halaman.
export default async function PilkadesLayout({ children }) {
  const supabase = await createClient();
  const { role } = await jagaHalamanPilkades(supabase);
  return (
    <>
      {!bisaUbahPilkades(role) && (
        <div className="mx-auto mb-5 max-w-5xl">
          <Pesan jenis="info" judul="Anda masuk sebagai Administrator">
            Data pemilih, TPS, calon, dan hasil suara hanya bisa dilihat di sini. Mengisi dan mengubahnya dilakukan oleh Panitia Pilkades.
          </Pesan>
        </div>
      )}
      {children}
    </>
  );
}
