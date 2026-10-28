import TabHalaman from "@/components/pilkades/TabHalaman";

// Menu gabungan "Jadwal & Pengaturan": Jadwal Tahapan + Susunan Panitia + Logo + Periode.
// Tiap tab tetap halaman sendiri; hak akses & isi tidak berubah.
export default function PengaturanLayout({ children }) {
  return (
    <>
      <TabHalaman
        judul="Jadwal & Pengaturan Panitia"
        tab={[
          { href: "/dashboard/pilkades/pengaturan/jadwal", label: "Jadwal Tahapan" },
          { href: "/dashboard/pilkades/pengaturan/panitia", label: "Susunan Panitia" },
          { href: "/dashboard/pilkades/pengaturan/logo", label: "Logo" },
          { href: "/dashboard/pilkades/pengaturan/periode", label: "Periode" },
        ]}
      />
      {children}
    </>
  );
}
