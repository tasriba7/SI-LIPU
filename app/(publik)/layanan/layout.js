import PanelWargaTabs from "@/components/PanelWargaTabs";

// Layout "Panel Warga" — membungkus semua halaman di bawah /layanan
// (ajukan layanan, cek status, riwayat ajuan) dengan judul panel dan
// bilah tab yang sama, sehingga ketiganya terasa sebagai satu menu.
export default function PanelWargaLayout({ children }) {
  return (
    <>
      <div className="bg-slate-50 px-4 pt-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-seablue">
            Panel Warga
          </p>
          <PanelWargaTabs />
        </div>
      </div>
      {children}
    </>
  );
}
