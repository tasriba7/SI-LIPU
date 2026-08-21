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
      },
    },
  },
  plugins: [],
};
