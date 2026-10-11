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
        // Palet: putih, hitam (navy), merah (royal), emas redup (gold)
        navy: {
          DEFAULT: "#141414",
          dark: "#0a0a0a",
          light: "#2a2a2a",
        },
        // Emas dibuat lebih jenuh (lebih "menyala") dari versi sebelumnya.
        gold: {
          DEFAULT: "#c9a24d",
          light: "#e3c47a",
        },
        seablue: "#e8574f",
        // Biru kobalt tegas — warna aksi utama (tombol, ikon, penanda aktif)
        // di tampilan terang. Dipadukan dengan navy (teks) & emas (sorotan).
        royal: {
          DEFAULT: "#d62828",
          dark: "#a61e1e",
          light: "#ef4444",
          pale: "#fdecec",
        },
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
        // Titik kecil mengorbit lambang hero.
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Pendar tombol utama yang "bernapas".
        napasCahaya: {
          "0%, 100%": { boxShadow: "0 10px 28px -8px rgba(214,40,40,0.55)" },
          "50%": { boxShadow: "0 14px 38px -6px rgba(214,40,40,0.85)" },
        },
        // Garis aksen yang tumbuh dari kiri saat judul muncul.
        garisTumbuh: {
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
        orbit: "orbit 18s linear infinite",
        napasCahaya: "napasCahaya 2.8s ease-in-out infinite",
        garisTumbuh: "garisTumbuh 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
      },
    },
  },
  plugins: [],
};
