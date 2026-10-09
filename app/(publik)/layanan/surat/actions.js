"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buatKodeTracking } from "@/lib/kodeTracking";
import { adalahNoHp, ambilTeks } from "@/lib/validasiPengajuan";

/**
 * Server Action untuk warga mengajukan surat lewat form publik (jalur lama),
 * TANPA login. Dipanggil dari <form action={formAction}> di app/layanan/surat/page.js.
 *
 * Insert memakai client service-role karena tabel tidak lagi menerima insert
 * langsung dari publik (migrasi 0029). Semua isian divalidasi & dibatasi di sini.
 */
export async function ajukanSurat(prevState, formData) {
  const jenis_surat = ambilTeks(formData, "jenis_surat", 100);
  const nama_pemohon = ambilTeks(formData, "nama_pemohon", 120);
  const nik = ambilTeks(formData, "nik", 16);
  const alamat = ambilTeks(formData, "alamat", 300);
  const no_hp = ambilTeks(formData, "no_hp", 20);
  const keperluan = ambilTeks(formData, "keperluan", 2000);

  if (!jenis_surat || !nama_pemohon || !nik || !alamat || !no_hp || !keperluan) {
    return { error: "Semua kolom wajib diisi." };
  }

  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }
  if (!adalahNoHp(no_hp)) {
    return { error: "Nomor HP tidak valid. Gunakan angka, spasi, tanda + atau -." };
  }

  const supabase = createAdminClient();

  for (let i = 0; i < 3; i++) {
    const kode_tracking = buatKodeTracking("SRT");
    const { error } = await supabase.from("pengajuan_surat").insert({
      kode_tracking,
      jenis_surat,
      nama_pemohon,
      nik,
      alamat,
      no_hp,
      keperluan,
    });

    if (!error) return { success: true, kode_tracking };
    // 23505 = kode tracking kebetulan kembar -> coba kode baru.
    if (error.code !== "23505") break;
  }

  return {
    error: "Gagal mengirim pengajuan. Coba lagi sebentar, atau hubungi kantor desa.",
  };
}
