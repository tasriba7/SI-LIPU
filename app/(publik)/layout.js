import PublicHeader from "@/components/PublicHeader";
import ScrollProgressBar from "@/components/ScrollProgressBar";

// Layout khusus route group "(publik)" — kurung di nama folder TIDAK muncul
// di URL. Semua halaman publik berbagi satu <PublicHeader /> yang SAMA (tidak
// remount tiap pindah halaman) dan satu <ScrollProgressBar />.
// Animasi perpindahan halaman ada di app/(publik)/template.js.
export default function PublikLayout({ children }) {
  return (
    <>
      <ScrollProgressBar />
      <PublicHeader />
      {children}
    </>
  );
}
