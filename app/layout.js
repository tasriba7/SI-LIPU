import "../styles/globals.css";
import SplashScreen from "@/components/SplashScreen";

export const metadata = {
  title: "SI-LIPU | Sistem Informasi Layanan Interaktif Pelayanan Umum",
  description:
    "Aplikasi layanan pemerintahan desa — SI-LIPU (Sistem Informasi Layanan Interaktif Pelayanan Umum).",
  icons: {
    icon: "/logo-si-lipu.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <SplashScreen>{children}</SplashScreen>
      </body>
    </html>
  );
}
