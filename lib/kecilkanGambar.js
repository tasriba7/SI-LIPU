// Dipanggil di BROWSER sebelum foto diunggah: foto dari kamera HP/DSLR bisa
// 6000+ piksel dan belasan MB. Browser sering menurunkan kualitas foto sebesar
// itu saat ditampilkan (jadi blur) dan upload-nya lambat. Di sini foto diperkecil
// ke sisi terpanjang 3000px dengan kualitas tinggi — tetap tajam di layar
// 4K/retina, tapi ukurannya jauh lebih ringan.
export const SISI_MAKS_PX = 3000;

export async function kecilkanGambar(file, { sisiMaks = SISI_MAKS_PX, kualitas = 0.92 } = {}) {
  try {
    // createImageBitmap otomatis memutar foto sesuai orientasi EXIF.
    const bmp = await createImageBitmap(file);
    const skala = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height));

    // Sudah cukup kecil: pakai apa adanya (tanpa kompres ulang yang tak perlu).
    if (skala === 1 && file.size <= 2.5 * 1024 * 1024) {
      bmp.close?.();
      return file;
    }

    const w = Math.round(bmp.width * skala);
    const h = Math.round(bmp.height * skala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // PNG transparan -> latar putih (JPEG tak punya transparansi)
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", kualitas));
    if (!blob || (skala === 1 && blob.size >= file.size)) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Format tak terbaca browser / gagal diproses: kirim aslinya, server yang menangani.
    return file;
  }
}
