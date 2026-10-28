import DetailPantau from "@/components/dashboard/DetailPantau";

export const metadata = { title: "Detail Aduan (Pilkades)" };

// Detail satu aduan Pilkades, mode lihat. Hanya baris yang lolos view pilkades_aduan_pantau
// yang bisa dibuka; aduan lain -> halaman "tidak ditemukan".
export default async function DetailAduanPilkadesPage({ params }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <DetailPantau id={id} sumber="pilkades_aduan_pantau" kembali="/dashboard/pilkades/aduan" />
    </div>
  );
}
