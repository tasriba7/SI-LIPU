import "../styles/globals.css";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import SplashScreen from "@/components/SplashScreen";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

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
    <html
      lang="id"
      className={`${playfairDisplay.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SplashScreen>{children}</SplashScreen>
      </body>
    </html>
  );
}
