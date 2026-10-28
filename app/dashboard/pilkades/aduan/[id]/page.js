import DetailPantau from "@/components/dashboard/DetailPantau";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import BalasAduanForm from "./BalasAduanForm";

export const metadata = { title: "Isi Aduan (Pilkades)" };

// Isi satu aduan Pilkades. Hanya baris yang lolos view pilkades_aduan_pantau yang bisa dibuka;
// aduan lain -> halaman "tidak ditemukan". Panitia membalas lewat tombol "Balas Aduan"
// (balasan = aduan diproses; tidak ada opsi tolak).
export default async function DetailAduanPilkadesPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { role } = await ambilRole(supabase);
  const panitia = bisaUbahPilkades(role);

  return (
    <div className="mx-auto max-w-5xl">
      <DetailPantau
        id={id}
        sumber="pilkades_aduan_pantau"
        kembali="/dashboard/pilkades/aduan"
        aksi={(p) =>
          panitia &&
          (p.status === "diajukan" ? (
            <BalasAduanForm id={p.id} />
          ) : (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Aduan ini sudah dibalas.
            </p>
          ))
        }
      />
    </div>
  );
}
