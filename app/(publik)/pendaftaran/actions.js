"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { adalahEmail, adalahNoHp, adalahUuid, ambilTeks } from "@/lib/validasiPengajuan";
import { cariWargaDenganRateLimit } from "@/lib/lookupWarga";
import {
  buatBuktiWarga,
  cekBuktiWarga,
  buatTiketKonfirmasi,
  bacaTiketKonfirmasi,
} from "@/lib/buktiVerifikasi";
import { maskNama, maskWilayah } from "@/lib/masking";

/**
 * Pencarian data warga untuk mengisi otomatis form pendaftaran. Aturannya
 * sama dengan form Ajukan Layanan (docs/SECURITY.md): dua faktor NIK +
 * tanggal lahir, dibatasi percobaan gagal, pesan gagal digeneralisasi, dan
 * yang dikirim ke browser hanya versi tersamar sampai warga menekan "Ya".
 */
export async function cariWargaUntukPendaftaran(prevState, formData) {
  const nik = formData.get("nik")?.trim();
  const tanggal_lahir = formData.get("tanggal_lahir");

  if (!nik || !tanggal_lahir) {
    return { error: "NIK dan tanggal lahir wajib diisi." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const hasil = await cariWargaDenganRateLimit(nik, tanggal_lahir);

  if (hasil.rateLimited) {
    return {
      error:
        "Terlalu banyak percobaan pencarian. Coba lagi dalam beberapa menit, atau isi data secara manual.",
    };
  }
  if (!hasil.found) {
    return {
      notFound: true,
      message: "Data tidak ditemukan. Anda tetap bisa lanjut isi data manual.",
    };
  }

  const { warga_id, nama_lengkap, dusun, rt } = hasil.data;
  return {
    found: true,
    nikDicoba: nik,
    pratinjau: {
      nama: maskNama(nama_lengkap),
      dusun: maskWilayah(dusun),
      rt: rt ? maskWilayah(rt) : "",
    },
    tiket: buatTiketKonfirmasi(warga_id, nik),
  };
}

/** Setelah warga menekan "Ya, ini saya": kirim nama lengkap + bukti server. */
export async function konfirmasiWargaUntukPendaftaran(nik, tiket) {
  const nikBersih = String(nik ?? "").trim();
  if (!/^\d{16}$/.test(nikBersih)) {
    return { error: "Konfirmasi tidak valid. Ulangi pencarian." };
  }
  const wargaId = bacaTiketKonfirmasi(tiket, nikBersih);
  if (!wargaId || !adalahUuid(wargaId)) {
    return { error: "Konfirmasi sudah kedaluwarsa. Ulangi pencarian." };
  }

  const admin = createAdminClient();
  const { data: w } = await admin
    .from("warga")
    .select("id, nama_lengkap")
    .eq("id", wargaId)
    .maybeSingle();
  if (!w) return { error: "Data tidak ditemukan. Ulangi pencarian." };

  return {
    data: { warga_id: w.id, nama_lengkap: w.nama_lengkap },
    buktiWarga: buatBuktiWarga(w.id, nikBersih),
  };
}

/**
 * Pendaftaran calon Kadus/Ketua RT/Kepala Desa lewat slot posisi.
 * Insert memakai client service-role karena tabel tidak lagi menerima insert
 * langsung dari publik (migrasi 0029). Trigger cegah_daftar_slot_terisi()
 * tetap berjalan di database.
 */
export async function daftarPosisi(prevState, formData) {
  const posisi_id = String(formData.get("posisi_id") ?? "");
  let nama_lengkap = ambilTeks(formData, "nama_lengkap", 120);
  const nik = ambilTeks(formData, "nik", 16);
  const no_hp = ambilTeks(formData, "no_hp", 20);
  const email = ambilTeks(formData, "email", 254).toLowerCase();

  if (!posisi_id || !nama_lengkap || !nik || !no_hp || !email) {
    return { error: "Semua kolom wajib diisi." };
  }
  if (!adalahUuid(posisi_id)) {
    return { error: "Posisi tidak valid." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }
  if (!adalahNoHp(no_hp)) {
    return { error: "Nomor HP tidak valid. Gunakan angka, spasi, tanda + atau -." };
  }
  if (!adalahEmail(email)) {
    return { error: "Format email tidak valid." };
  }

  const supabase = createAdminClient();

  // Kalau data diisi lewat pencarian NIK + tanggal lahir yang terbukti sah
  // (bukti bertanda tangan dari server), nama diambil dari data kependudukan,
  // bukan dari isian form.
  const wargaIdForm = String(formData.get("warga_id") ?? "").trim();
  if (adalahUuid(wargaIdForm) && cekBuktiWarga(formData.get("bukti_warga"), wargaIdForm, nik)) {
    const { data: w } = await supabase
      .from("warga")
      .select("nama_lengkap")
      .eq("id", wargaIdForm)
      .maybeSingle();
    if (w?.nama_lengkap) nama_lengkap = w.nama_lengkap;
  }

  // Cegah antrian admin dibanjiri: satu NIK hanya boleh punya satu pendaftaran
  // berstatus menunggu untuk posisi yang sama.
  const { count } = await supabase
    .from("pendaftaran_akun")
    .select("id", { count: "exact", head: true })
    .eq("posisi_id", posisi_id)
    .eq("nik", nik)
    .eq("status", "pending");
  if (count > 0) {
    return { error: "Pendaftaran Anda untuk posisi ini sudah masuk dan sedang menunggu persetujuan admin." };
  }

  const { error } = await supabase.from("pendaftaran_akun").insert({
    posisi_id,
    nama_lengkap,
    nik,
    no_hp,
    email,
  });

  if (error) {
    // Trigger cegah_daftar_slot_terisi() melempar pesan yang diawali
    // "SLOT_TERISI:" — deteksi itu supaya pesan ke warga jelas.
    if (error.message?.includes("SLOT_TERISI")) {
      return {
        error: "Slot untuk posisi & wilayah ini sudah terisi. Hubungi admin desa.",
      };
    }
    return { error: "Gagal mengirim pendaftaran. Coba lagi." };
  }

  return { success: true };
}
