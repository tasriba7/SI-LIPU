// Validasi isian pengajuan dari form PUBLIK. Semua dicek di server, jangan
// percaya tampilan form. (Aturannya sama dengan periksaDataTambahan di
// app/dashboard/layanan/buat/actions.js.)
const ISO_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_NO_HP = /^[0-9+\-()\s]{6,20}$/;
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const adalahUuid = (v) => typeof v === "string" && POLA_UUID.test(v);
export const adalahEmail = (v) => typeof v === "string" && v.length <= 254 && POLA_EMAIL.test(v);
export const adalahNoHp = (v) => typeof v === "string" && POLA_NO_HP.test(v);

/** Ambil string dari FormData: dipangkas dan dibatasi panjangnya. */
export function ambilTeks(formData, nama, maks) {
  return String(formData.get(nama) ?? "").trim().slice(0, maks);
}

/** Rapikan & periksa isian tambahan sesuai form_schema jenis layanan. */
export function periksaDataTambahan(schema, mentah) {
  let obj = {};
  const teks = String(mentah ?? "{}");
  if (teks.length <= 20000) {
    try {
      const parsed = JSON.parse(teks);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) obj = parsed;
    } catch {
      obj = {};
    }
  }

  const hasil = {};
  for (const f of Array.isArray(schema) ? schema : []) {
    const v = String(obj?.[f.field_key] ?? "").trim().slice(0, 1000);
    if (!v) {
      if (f.wajib) return { error: `"${f.label}" wajib diisi.` };
      continue;
    }
    if (f.tipe === "pilihan" && !(f.opsi || []).includes(v)) {
      return { error: `Pilihan untuk "${f.label}" tidak valid.` };
    }
    if (f.tipe === "tanggal" && !ISO_TANGGAL.test(v)) {
      return { error: `Tanggal pada "${f.label}" tidak valid.` };
    }
    if (f.tipe === "angka" && !Number.isFinite(Number(v))) {
      return { error: `"${f.label}" harus berupa angka.` };
    }
    hasil[f.field_key] = v;
  }
  return { hasil };
}
