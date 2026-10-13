import PublicHeader from "@/components/PublicHeader";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import ScrollKeAtas from "@/components/ScrollKeAtas";
import LatarHalamanPublik from "@/components/LatarHalamanPublik";
import { createClient } from "@/lib/supabase/server";
import { getFotoHero } from "@/lib/fotoHero";

// Layout khusus route group "(publik)" — kurung di nama folder TIDAK muncul
// di URL. Semua halaman publik berbagi satu <PublicHeader /> yang SAMA (tidak
// remount tiap pindah halaman) dan satu <ScrollProgressBar />.
// Animasi perpindahan halaman ada di app/(publik)/template.js.
//
// Latar foto (dari menu admin "Foto Beranda") dipasang di sini untuk semua
// halaman selain beranda — lihat components/LatarHalamanPublik.jsx.
export default async function PublikLayout({ children }) {
  const supabase = await createClient();
  const fotoRows = await getFotoHero(supabase);
  const foto = fotoRows.map((r) => r.gambar_url).filter(Boolean);

  return (
    <>
      <ScrollProgressBar />
      <PublicHeader />
      <LatarHalamanPublik foto={foto}>{children}</LatarHalamanPublik>
      <ScrollKeAtas />
    </>
  );
}
