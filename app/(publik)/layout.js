import PublicHeader from "@/components/PublicHeader";

// Layout khusus route group "(publik)" — kurung di nama folder ini TIDAK
// muncul di URL (fitur Next.js "route group"), cuma cara mengelompokkan
// semua halaman publik (beranda, galeri, ajukan layanan, cek status,
// pendaftaran Kadus/RT) supaya berbagi satu <PublicHeader /> yang SAMA,
// bukan tiap halaman render headernya sendiri-sendiri seperti sebelumnya.
//
// Efeknya: header sekarang TIDAK remount/re-fetch identitas desa setiap
// kali warga pindah halaman (mis. beranda -> galeri -> cek status) —
// dulu ini salah satu penyebab perpindahan terasa "keras", karena
// seluruh halaman termasuk header ikut dibongkar-pasang tiap klik menu.
// Sekarang cuma konten di bawah header yang berganti (lihat
// app/(publik)/template.js untuk animasinya).
export default function PublikLayout({ children }) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  );
}
