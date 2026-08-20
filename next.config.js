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
};

module.exports = nextConfig;
