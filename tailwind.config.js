/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Playfair Display: serif klasik berkontras tinggi untuk judul —
        // kesan resmi/institusional, cocok untuk portal layanan pemerintahan desa.
        display: ["var(--font-display)", "Georgia", "serif"],
        // Plus Jakarta Sans: sans modern, gampang dibaca di layar kecil.
        sans: ["var(--font-body)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Warna diambil dari logo SI-LIPU
        navy: {
          DEFAULT: "#0B2C6B",
          dark: "#081E4A",
          light: "#123A8A",
        },
        gold: {
          DEFAULT: "#E8B933",
          light: "#F2CC5B",
        },
        seablue: "#3FA9F5",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pageIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Angka jam "naik" ala odometer: angka baru masuk dari bawah,
        // angka lama keluar ke atas (dipakai di JamTanggalBeranda).
        naikMasuk: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        naikKeluar: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-100%)" },
        },
        // --- Tambahan tampilan publik (murni visual) ---
        // Melayang pelan naik-turun (partikel & lencana hero).
        melayang: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
        // Kilau yang menyapu permukaan (tombol utama, progress bar).
        kilau: {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "60%, 100%": { transform: "translateX(260%) skewX(-18deg)" },
        },
        // Gradasi teks/latar yang bergeser perlahan.
        gradasiGeser: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Cincin cahaya memancar (lambang & titik status).
        cincinDenyut: {
          "0%": { transform: "scale(0.9)", opacity: "0.55" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        // Gelombang bergeser horizontal tanpa putus.
        gelombang: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Bar progres isi dari kiri.
        isiBar: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-out forwards",
        fadeOut: "fadeOut 0.5s ease-in forwards",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease-out forwards",
        // Transisi halus saat pindah halaman (dipakai di app/template.js) —
        // sengaja singkat & tanpa jarak geser besar supaya terasa responsif,
        // bukan bikin pengguna menunggu.
        pageIn: "pageIn 0.28s ease-out forwards",
        naikMasuk: "naikMasuk 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        naikKeluar: "naikKeluar 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        melayang: "melayang 7s ease-in-out infinite",
        kilau: "kilau 3.6s ease-in-out infinite",
        gradasiGeser: "gradasiGeser 9s ease-in-out infinite",
        cincinDenyut: "cincinDenyut 2.8s ease-out infinite",
        gelombang: "gelombang 22s linear infinite",
        isiBar: "isiBar 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
