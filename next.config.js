/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Default Next.js Server Actions cuma izinkan body 1MB — terlalu kecil
    // untuk upload foto latar beranda di /dashboard/pengaturan-desa.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },

  // Jalur pengajuan surat lama (/layanan/surat) ditutup: warga diarahkan ke
  // form layanan baru (/layanan) supaya semua pengajuan masuk ke satu inbox
  // di /dashboard/layanan. Sengaja HANYA halaman form-nya; /layanan/surat/cek
  // tetap hidup agar warga yang punya kode tracking lama masih bisa cek status.
  async redirects() {
    return [
      {
        source: "/layanan/surat",
        destination: "/layanan",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
