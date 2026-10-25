import { createClient } from "@/lib/supabase/server";
import { ambilPeriode } from "@/lib/pilkades";
import { ambilKunciPilkades } from "@/lib/pilkadesKunci";
import TabHalaman from "@/components/pilkades/TabHalaman";

// Menu gabungan "Hari Pemungutan": Cetak Daftar Hadir + Hasil Suara & Berita Acara.
// Tab yang belum waktunya diberi gembok (klik = penjelasan).
export default async function HariHLayout({ children }) {
  const supabase = await createClient();
  const peta = await ambilKunciPilkades(supabase, await ambilPeriode(supabase));
  return (
    <>
      <TabHalaman
        judul="Hari Pemungutan"
        tab={[
          { href: "/dashboard/pilkades/hari-h/hadir", label: "1. Cetak Daftar Hadir", kunci: peta["/dashboard/pilkades/hari-h/hadir"] },
          { href: "/dashboard/pilkades/hari-h/hasil", label: "2. Hasil Suara & Berita Acara", kunci: peta["/dashboard/pilkades/hari-h/hasil"] },
        ]}
      />
      {children}
    </>
  );
}
