import PanelWargaTabs from "@/components/PanelWargaTabs";
import BannerHalaman from "@/components/BannerHalaman";

// Layout "Panel Warga" — membungkus semua halaman di bawah /layanan
// (ajukan layanan, cek status, riwayat ajuan) dengan judul panel dan
// bilah tab yang sama, sehingga ketiganya terasa sebagai satu menu.
export default function PanelWargaLayout({ children }) {
  return (
    <>
      <BannerHalaman
        kunci="layanan"
        kecil="Tanpa Akun, Tanpa Antre"
        judul="Panel Warga"
        ringkas
      />
      <div className="bg-slate-50 px-4 pt-8">
        <div className="mx-auto max-w-3xl text-center">
          <PanelWargaTabs />
        </div>
      </div>
      {children}
    </>
  );
}
