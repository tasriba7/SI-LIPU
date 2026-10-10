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
import {
  mulaiVerifikasiTempatLahir,
  periksaPilihanTempatLahir,
} from "@/lib/verifikasiTempatLahir";

/**
 * Apakah satu baris pendaftaran (hasil join posisi_perangkat) berarti
 * pemiliknya masih menjabat? Syaratnya: disetujui, slot masih "terisi", dan
 * slot itu diisi oleh persetujuan ini (diisi_pada <= tanggal_diproses; saat
 * approve, slot dikunci lebih dulu baru pendaftaran ditandai disetujui).
 * Kalau slot sempat dikosongkan lalu diisi orang lain, diisi_pada-nya lebih
 * baru, jadi pemegang lama tidak ikut terblokir.
 */
function sedangMenjabat(r) {
  if (r.status !== "disetujui") return false;
  const posisi = Array.isArray(r.posisi_perangkat) ? r.posisi_perangkat[0] : r.posisi_perangkat;
  if (posisi?.status !== "terisi") return false;
  if (!posisi.diisi_pada || !r.tanggal_diproses) return true;
  return new Date(posisi.diisi_pada) <= new Date(r.tanggal_diproses);
}

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

  // Faktor ketiga: tebak tempat lahir (salah 3 kali -> dibatalkan & dikunci).
  const tl = await mulaiVerifikasiTempatLahir(createAdminClient(), warga_id, nik);
  if (tl.batal) return { error: tl.pesan };
  if (!tl.lewati) {
    return {
      verifikasi: { opsi: tl.opsi, tiket: tl.tiket, sisa: tl.sisa },
      nikDicoba: nik,
    };
  }

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

/** Pilihan tempat lahir benar -> terbitkan pratinjau tersamar + tiket konfirmasi. */
export async function verifikasiTempatLahirUntukPendaftaran(nik, tiketTL, pilihan) {
  const nikBersih = String(nik ?? "").trim();
  if (!/^\d{16}$/.test(nikBersih)) {
    return { error: "Verifikasi tidak valid. Ulangi pencarian." };
  }

  const admin = createAdminClient();
  const r = await periksaPilihanTempatLahir(admin, nikBersih, tiketTL, pilihan);
  if (!r.ok) return r;

  const { data: w } = await admin
    .from("warga")
    .select("id, nama_lengkap, dusun, rt")
    .eq("id", r.wargaId)
    .maybeSingle();
  if (!w) return { error: "Data tidak ditemukan. Ulangi pencarian." };

  return {
    ok: true,
    pratinjau: {
      nama: maskNama(w.nama_lengkap),
      dusun: maskWilayah(w.dusun),
      rt: w.rt ? maskWilayah(w.rt) : "",
    },
    tiket: buatTiketKonfirmasi(w.id, nikBersih),
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

  // Satu NIK = satu jabatan. Tolak kalau NIK ini:
  //  (a) sudah menjabat: pendaftarannya pernah disetujui dan slot yang dipegang
  //      masih terisi oleh akun hasil persetujuan itu, atau
  //  (b) masih punya pendaftaran menunggu persetujuan (posisi mana pun).
  // Slot yang sudah dikosongkan admin (atau akunnya dihapus) tidak dihitung,
  // jadi pemegang lama boleh mendaftar lagi.
  const { data: riwayatNik, error: errRiwayat } = await supabase
    .from("pendaftaran_akun")
    .select("status, tanggal_diproses, posisi_perangkat(status, diisi_pada)")
    .eq("nik", nik)
    .in("status", ["pending", "disetujui"]);
  if (errRiwayat) {
    return { error: "Gagal memeriksa data pendaftaran. Coba lagi." };
  }
  if ((riwayatNik ?? []).some((r) => sedangMenjabat(r))) {
    return {
      error:
        "NIK ini sudah terdaftar sebagai Kepala Desa/Kadus/Ketua RT. Satu orang hanya boleh memegang satu jabatan. Hubungi admin desa kalau ada yang keliru.",
    };
  }
  if ((riwayatNik ?? []).some((r) => r.status === "pending")) {
    return {
      error:
        "Pendaftaran dengan NIK ini sudah masuk dan sedang menunggu persetujuan admin.",
    };
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
    // Pengaman di database (migrasi 0031) kalau dua permintaan berbarengan.
    if (error.message?.includes("NIK_SUDAH_")) {
      return {
        error:
          "NIK ini sudah terdaftar sebagai pemegang jabatan atau sedang menunggu persetujuan admin.",
      };
    }
    return { error: "Gagal mengirim pendaftaran. Coba lagi." };
  }

  return { success: true };
}
