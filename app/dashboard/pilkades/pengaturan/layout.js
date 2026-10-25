import TabHalaman from "@/components/pilkades/TabHalaman";

// Menu gabungan "Pengaturan Panitia": Periode + Susunan Panitia + Logo.
// Tiap tab tetap halaman sendiri; hak akses & isi tidak berubah.
export default function PengaturanLayout({ children }) {
  return (
    <>
      <TabHalaman
        judul="Pengaturan Panitia"
        tab={[
          { href: "/dashboard/pilkades/pengaturan/panitia", label: "Susunan Panitia" },
          { href: "/dashboard/pilkades/pengaturan/logo", label: "Logo" },
          { href: "/dashboard/pilkades/pengaturan/periode", label: "Periode" },
        ]}
      />
      {children}
    </>
  );
}
