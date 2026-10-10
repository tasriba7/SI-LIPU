"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cariWargaDenganRateLimit } from "@/lib/lookupWarga";
import { buatKodeTracking } from "@/lib/kodeTracking";
import {
  buatBuktiVerifikasi,
  bacaBuktiVerifikasi,
  pakaiBuktiVerifikasi,
  lepasBuktiVerifikasi,
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
import { JENIS_PENGADUAN, JENIS_LAINNYA } from "@/lib/jenisPengaduan";
import {
  adalahUuid,
  adalahNoHp,
  ambilTeks,
  periksaDataTambahan,
} from "@/lib/validasiPengajuan";

/**
 * Step 1 (opsional, tergantung butuh_lookup_warga jenis layanan): cari data
 * warga lewat NIK + Tanggal Lahir. Ikuti docs/SECURITY.md — jangan ubah pola
 * ini (dua faktor, tanpa autocomplete, pesan gagal digeneralisasi).
 */
export async function cariWargaUntukLayanan(prevState, formData) {
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
    // Pesan SENGAJA digeneralisasi — jangan bilang NIK/tanggal lahir mana
    // yang salah (docs/SECURITY.md poin 5).
    return {
      notFound: true,
      message: "Data tidak ditemukan. Anda tetap bisa lanjut isi data manual di bawah.",
    };
  }

  const { warga_id, nama_lengkap, dusun, rt } = hasil.data;

  // Faktor ketiga: tebak tempat lahir (pilihan bertanda inisial). Pratinjau
  // "Apakah ini Anda?" BARU diberikan setelah pilihan benar. Salah 3 kali ->
  // pencarian dibatalkan (dihitung & dikunci di server).
  const tl = await mulaiVerifikasiTempatLahir(createAdminClient(), warga_id, nik);
  if (tl.batal) return { error: tl.pesan };
  if (!tl.lewati) {
    return {
      verifikasi: { opsi: tl.opsi, tiket: tl.tiket, sisa: tl.sisa },
      nikDicoba: nik,
    };
  }

  // Tempat lahir belum terisi di data kependudukan -> tidak bisa ditanyakan,
  // lanjut seperti biasa (admin sebaiknya melengkapi data itu).
  // SECURITY.md poin 1.4: yang dikirim ke browser HANYA versi tersamar.
  // Data lengkap baru keluar lewat konfirmasiWargaUntukLayanan, setelah
  // warga menekan "Ya, ini saya".
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

/**
 * Step 1a: warga memilih tempat lahir. Hanya kalau benar, server menerbitkan
 * pratinjau tersamar + tiket konfirmasi. Salah 3 kali -> { batal, pesan }.
 */
export async function verifikasiTempatLahirUntukLayanan(nik, tiketTL, pilihan) {
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

/**
 * Step 1b: warga menekan "Ya, ini saya". Hanya dengan tiket sah dari
 * cariWargaUntukLayanan (terikat NIK, kedaluwarsa 10 menit) server mengirim
 * data lengkap + bukti-bukti yang dibutuhkan untuk langkah berikutnya.
 */
export async function konfirmasiWargaUntukLayanan(nik, tiket) {
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
    .select("id, nama_lengkap, dusun, rt, rw")
    .eq("id", wargaId)
    .maybeSingle();

  if (!w) {
    return { error: "Data tidak ditemukan. Ulangi pencarian." };
  }

  return {
    data: {
      warga_id: w.id,
      nama_lengkap: w.nama_lengkap,
      dusun: w.dusun,
      rt: w.rt,
      rw: w.rw,
    },
    // Sekali pakai, tanpa identitas: syarat mengirim pengaduan.
    bukti: buatBuktiVerifikasi(),
    // Mengikat warga_id + NIK: syarat menautkan pengajuan ke data warga.
    buktiWarga: buatBuktiWarga(w.id, nikBersih),
  };
}

/**
 * Step 2: submit pengajuan layanan (generik, berlaku untuk semua jenis
 * layanan yang dibuat lewat Form Builder).
 *
 * Penyimpanan memakai client service-role (bukan anon): tabel tidak lagi
 * menerima insert langsung dari publik (migrasi 0029), jadi SEMUA aturan di
 * bawah ini tidak bisa dilewati dengan memanggil API Supabase sendiri.
 */
export async function ajukanLayanan(prevState, formData) {
  const jenis_layanan_id = String(formData.get("jenis_layanan_id") ?? "");
  const anonim = formData.get("anonim") === "1";
  const keterangan = ambilTeks(formData, "keterangan", 5000) || null;

  if (!adalahUuid(jenis_layanan_id)) {
    return { error: "Jenis layanan tidak valid." };
  }

  const supabase = await createClient();

  // Kategori, prefix kode & skema form selalu diambil dari database
  // (bukan percaya isian form).
  const { data: jenis } = await supabase
    .from("jenis_layanan_master")
    .select("kategori, kode_prefix, form_schema")
    .eq("id", jenis_layanan_id)
    .eq("aktif", true)
    .maybeSingle();

  if (!jenis) {
    return { error: "Jenis layanan tidak valid." };
  }
  const adalahPengaduan = jenis.kategori === "pengaduan";

  const tambahan = periksaDataTambahan(jenis.form_schema, formData.get("data_tambahan_json"));
  if (tambahan.error) return { error: tambahan.error };

  // Pengaduan: wajib sudah verifikasi NIK + tanggal lahir (anonim maupun
  // tidak). Bukti dicek di sini, tapi baru DIHANGUSKAN tepat sebelum insert.
  let bukti = null;
  let jenis_pengaduan = null;
  if (adalahPengaduan) {
    bukti = bacaBuktiVerifikasi(formData.get("bukti_verifikasi"));
    if (!bukti) {
      return {
        error:
          "Verifikasi NIK dan tanggal lahir sudah kedaluwarsa atau belum dilakukan. Muat ulang halaman lalu ulangi dari awal.",
      };
    }

    const pilihan = formData.get("jenis_pengaduan")?.trim();
    if (!pilihan || !JENIS_PENGADUAN.includes(pilihan)) {
      return { error: "Pilih jenis pengaduan terlebih dahulu." };
    }
    if (pilihan === JENIS_LAINNYA) {
      const lainnya = formData.get("jenis_pengaduan_lainnya")?.trim();
      if (!lainnya) {
        return { error: "Tuliskan pengaduan Anda tentang apa." };
      }
      jenis_pengaduan = `${JENIS_LAINNYA}: ${lainnya.slice(0, 120)}`;
    } else {
      jenis_pengaduan = pilihan;
    }
    if (!keterangan) {
      return { error: "Isi pengaduan wajib diisi." };
    }
  }

  const admin = createAdminClient();

  // Identitas pelapor. Kalau ANONIM: tidak ada satu pun data identitas yang
  // dibaca dari form maupun disimpan (nama, NIK, No. HP, tautan data warga).
  let nama_pemohon = null;
  let nik = null;
  let no_hp = null;
  let warga_id = null;

  if (anonim) {
    if (!adalahPengaduan) {
      return { error: "Mode anonim hanya tersedia untuk layanan pengaduan." };
    }
  } else {
    nama_pemohon = ambilTeks(formData, "nama_pemohon", 120);
    nik = ambilTeks(formData, "nik", 16);
    no_hp = ambilTeks(formData, "no_hp", 20);

    if (!nama_pemohon || !nik || !no_hp) {
      return { error: "Semua kolom wajib diisi." };
    }
    if (!/^\d{16}$/.test(nik)) {
      return { error: "NIK harus berupa 16 digit angka." };
    }
    if (!adalahNoHp(no_hp)) {
      return { error: "Nomor HP tidak valid. Gunakan angka, spasi, tanda + atau -." };
    }

    // warga_id HANYA diterima kalau ada bukti dari server bahwa NIK ini baru
    // saja lolos verifikasi dengan warga_id tersebut. Kalau tidak cocok,
    // pengajuan tetap diterima sebagai isian manual (tanpa tautan ke warga).
    const wargaIdForm = String(formData.get("warga_id") ?? "").trim();
    if (
      adalahUuid(wargaIdForm) &&
      cekBuktiWarga(formData.get("bukti_warga"), wargaIdForm, nik)
    ) {
      warga_id = wargaIdForm;
      // Nama diambil dari data kependudukan, bukan dari isian form.
      const { data: w } = await admin
        .from("warga")
        .select("nama_lengkap")
        .eq("id", warga_id)
        .maybeSingle();
      if (w?.nama_lengkap) nama_pemohon = w.nama_lengkap;
    }
  }

  // Satu verifikasi = satu pengaduan. Dihanguskan ATOMIK tepat sebelum insert.
  if (adalahPengaduan) {
    const r = await pakaiBuktiVerifikasi(admin, bukti);
    if (!r.ok) {
      return {
        error: r.terpakai
          ? "Verifikasi ini sudah dipakai untuk mengirim pengaduan. Muat ulang halaman lalu ulangi verifikasi dari awal."
          : "Gagal memproses verifikasi. Coba lagi sebentar.",
      };
    }
  }

  // Kode anonim lebih panjang (10 karakter) karena jadi satu-satunya kunci pelapor.
  // Prefix diambil dari database, bukan dari form.
  const prefix = jenis.kode_prefix || "PL";
  let kode_tracking = null;
  for (let i = 0; i < 3; i++) {
    const kode = buatKodeTracking(prefix, anonim ? 10 : 6);
    const { error } = await admin.from("pengajuan_layanan").insert({
      kode_tracking: kode,
      jenis_layanan_id,
      warga_id,
      nama_pemohon,
      nik,
      no_hp,
      keterangan,
      jenis_pengaduan,
      data_tambahan: tambahan.hasil,
      anonim,
    });

    if (!error) {
      kode_tracking = kode;
      break;
    }
    // 23505 = kode tracking kebetulan kembar -> buat kode baru lalu coba lagi.
    if (error.code !== "23505") break;
  }

  if (!kode_tracking) {
    // Kegagalan di sisi server: kembalikan jatah verifikasi supaya warga bisa mencoba lagi.
    if (adalahPengaduan) await lepasBuktiVerifikasi(admin, bukti.nonce);
    return {
      error: "Gagal mengirim pengajuan. Coba lagi sebentar, atau hubungi kantor desa.",
    };
  }

  return { success: true, kode_tracking, anonim };
}
