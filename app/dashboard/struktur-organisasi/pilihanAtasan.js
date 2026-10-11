// Daftar pilihan "Atasan langsung" berurutan sesuai pohon, dengan awalan
// strip supaya tingkat bawahan terlihat. Dipakai halaman tambah & edit.
export function daftarPilihanAtasan(pohon, tingkat = 0, hasil = []) {
  for (const n of pohon) {
    hasil.push({ id: n.id, label: `${"— ".repeat(tingkat)}${n.jabatan} · ${n.nama}` });
    daftarPilihanAtasan(n.anak, tingkat + 1, hasil);
  }
  return hasil;
}
