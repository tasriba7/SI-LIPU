import { urutanPendidikan } from "@/lib/pendidikanOptions";

// Urutan tampil anggota dalam 1 KK, mengikuti susunan KK pada umumnya.
const URUTAN_STATUS = ["Kepala Keluarga", "Istri", "Anak", "Famili Lain", "Lainnya"];

export function hitungUsia(tanggalLahir, acuan = new Date()) {
  if (!tanggalLahir) return null;
  const [y, m, d] = String(tanggalLahir).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  let usia = acuan.getFullYear() - y;
  const belumUlangTahun =
    acuan.getMonth() + 1 < m || (acuan.getMonth() + 1 === m && acuan.getDate() < d);
  if (belumUlangTahun) usia -= 1;
  return usia >= 0 ? usia : null;
}

export function formatUsia(usia) {
  return usia === null || usia === undefined ? "-" : `${usia} th`;
}

function urutStatus(s) {
  const i = URUTAN_STATUS.indexOf(s);
  return i === -1 ? URUTAN_STATUS.length : i;
}

/** Urutkan: Kepala -> Istri -> Anak (tertua dulu) -> lainnya. */
export function urutkanAnggota(anggota) {
  return [...anggota].sort((a, b) => {
    const s = urutStatus(a.status_dalam_kk) - urutStatus(b.status_dalam_kk);
    if (s !== 0) return s;
    // tanggal lahir lebih awal = lebih tua = tampil lebih dulu
    return String(a.tanggal_lahir ?? "").localeCompare(String(b.tanggal_lahir ?? ""));
  });
}

// Hitung kemunculan nilai, nilai kosong dikelompokkan sebagai "Belum diisi".
function hitungKelompok(daftar, ambil, urut) {
  const peta = new Map();
  for (const item of daftar) {
    const nilai = (ambil(item) ?? "").toString().trim() || "Belum diisi";
    peta.set(nilai, (peta.get(nilai) ?? 0) + 1);
  }
  const hasil = [...peta.entries()].map(([nama, jumlah]) => ({ nama, jumlah }));
  hasil.sort((a, b) => {
    if (a.nama === "Belum diisi") return 1;
    if (b.nama === "Belum diisi") return -1;
    return urut ? urut(a.nama, b.nama) : b.jumlah - a.jumlah || a.nama.localeCompare(b.nama);
  });
  return hasil;
}

/**
 * Ringkasan 1 keluarga dari daftar anggotanya (baris tabel `warga`).
 * Fungsi murni: tidak menyentuh database.
 */
export function ringkasKeluarga(anggotaMentah, acuan = new Date()) {
  const anggota = urutkanAnggota(anggotaMentah).map((a) => ({
    ...a,
    usia: hitungUsia(a.tanggal_lahir, acuan),
  }));

  const kepala = anggota.filter((a) => a.status_dalam_kk === "Kepala Keluarga");
  const usiaAda = anggota.map((a) => a.usia).filter((u) => u !== null);

  const pendidikanTercatat = anggota
    .map((a) => a.pendidikan)
    .filter(Boolean)
    .sort((a, b) => urutanPendidikan(b) - urutanPendidikan(a));

  const peringatan = [];
  if (kepala.length === 0) peringatan.push("Belum ada anggota yang ditandai sebagai Kepala Keluarga.");
  const tanpaPendidikan = anggota.filter((a) => !a.pendidikan).length;
  if (tanpaPendidikan > 0) {
    peringatan.push(`${tanpaPendidikan} anggota belum diisi pendidikannya.`);
  }
  const tanpaPekerjaan = anggota.filter((a) => !a.pekerjaan).length;
  if (tanpaPekerjaan > 0) {
    peringatan.push(`${tanpaPekerjaan} anggota belum diisi pekerjaannya.`);
  }

  return {
    anggota,
    kepala: kepala[0] ?? null,
    jumlahAnggota: anggota.length,
    lakiLaki: anggota.filter((a) => a.jenis_kelamin === "L").length,
    perempuan: anggota.filter((a) => a.jenis_kelamin === "P").length,
    jumlahIstri: anggota.filter((a) => a.status_dalam_kk === "Istri").length,
    jumlahAnak: anggota.filter((a) => a.status_dalam_kk === "Anak").length,
    jumlahFamiliLain: anggota.filter(
      (a) => a.status_dalam_kk === "Famili Lain" || a.status_dalam_kk === "Lainnya"
    ).length,
    // Di bawah 18 tahun (apa pun status KK-nya) — berguna untuk bantuan/sekolah.
    jumlahDiBawah18: usiaAda.filter((u) => u < 18).length,
    jumlahLansia: usiaAda.filter((u) => u >= 60).length,
    usiaTermuda: usiaAda.length ? Math.min(...usiaAda) : null,
    usiaTertua: usiaAda.length ? Math.max(...usiaAda) : null,
    pendidikanTertinggi: pendidikanTercatat[0] ?? null,
    perPendidikan: hitungKelompok(
      anggota,
      (a) => a.pendidikan,
      (x, y) => urutanPendidikan(x) - urutanPendidikan(y)
    ),
    perPekerjaan: hitungKelompok(anggota, (a) => a.pekerjaan),
    perStatusKawin: hitungKelompok(anggota, (a) => a.status_kawin),
    perAgama: hitungKelompok(anggota, (a) => a.agama),
    peringatan,
  };
}
