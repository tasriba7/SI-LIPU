/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
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
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-out forwards",
        fadeOut: "fadeOut 0.5s ease-in forwards",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
