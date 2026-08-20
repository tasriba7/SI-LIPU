"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { simpanPengaturanDesa } from "./actions";

// API publik data wilayah administratif Indonesia (Kemendagri, Permendagri
// 72/2019) — tanpa API key, dipakai supaya admin desa tidak perlu ketik
// manual nama kecamatan/kabupaten/provinsi (dan supaya penulisannya
// konsisten/tidak typo). Kalau API ini tidak bisa diakses (mis. desa dengan
// koneksi lambat/terputus), form otomatis beralih ke isian manual.
const WILAYAH_API = "https://wilayah.id/api";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Pengaturan"}
    </button>
  );
}

function Label({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-slate-50 disabled:text-slate-400";

export default function FormPengaturanDesa({ config }) {
  const [state, formAction] = useActionState(simpanPengaturanDesa, {});

  const [manual, setManual] = useState(false);
  const [gagalMuatWilayah, setGagalMuatWilayah] = useState(false);

  const [provinsiList, setProvinsiList] = useState([]);
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);

  const [provinsiKode, setProvinsiKode] = useState("");
  const [kabupatenKode, setKabupatenKode] = useState("");

  const [provinsiNama, setProvinsiNama] = useState(config.provinsi || "");
  const [kabupatenNama, setKabupatenNama] = useState(config.kabupaten || "");
  const [kecamatanNama, setKecamatanNama] = useState(config.kecamatan || "");
  const [namaDesa, setNamaDesa] = useState(config.nama_desa || "");
  const [jenisWilayah, setJenisWilayah] = useState(config.jenis_wilayah || "Desa");
  const [alamat, setAlamat] = useState(config.alamat || "");

  const [preview, setPreview] = useState(config.foto_url || null);
  const [hapusFoto, setHapusFoto] = useState(false);

  const [previewLogo, setPreviewLogo] = useState(config.logo_url || null);
  const [hapusLogo, setHapusLogo] = useState(false);

  // Muat daftar provinsi sekali di awal.
  useEffect(() => {
    fetch(`${WILAYAH_API}/provinces.json`)
      .then((r) => r.json())
      .then((d) => setProvinsiList(d?.data ?? []))
      .catch(() => {
        setGagalMuatWilayah(true);
        setManual(true);
      });
  }, []);

  // Kalau pengaturan sudah pernah diisi sebelumnya, cocokkan nama provinsi
  // yang tersimpan ke daftar supaya dropdown kabupaten ikut terisi otomatis.
  useEffect(() => {
    if (!config.provinsi || provinsiKode) return;
    const cocok = provinsiList.find(
      (p) => p.name.toLowerCase() === config.provinsi.toLowerCase()
    );
    if (cocok) setProvinsiKode(cocok.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinsiList]);

  useEffect(() => {
    if (!provinsiKode) {
      setKabupatenList([]);
      return;
    }
    fetch(`${WILAYAH_API}/regencies/${provinsiKode}.json`)
      .then((r) => r.json())
      .then((d) => setKabupatenList(d?.data ?? []))
      .catch(() => setGagalMuatWilayah(true));
  }, [provinsiKode]);

  useEffect(() => {
    if (!config.kabupaten || kabupatenKode) return;
    const cocok = kabupatenList.find(
      (k) => k.name.toLowerCase() === config.kabupaten.toLowerCase()
    );
    if (cocok) setKabupatenKode(cocok.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kabupatenList]);

  useEffect(() => {
    if (!kabupatenKode) {
      setKecamatanList([]);
      return;
    }
    fetch(`${WILAYAH_API}/districts/${kabupatenKode}.json`)
      .then((r) => r.json())
      .then((d) => setKecamatanList(d?.data ?? []))
      .catch(() => setGagalMuatWilayah(true));
  }, [kabupatenKode]);

  function pilihProvinsi(e) {
    const kode = e.target.value;
    const nama = e.target.options[e.target.selectedIndex]?.text || "";
    setProvinsiKode(kode);
    setProvinsiNama(kode ? nama : "");
    setKabupatenKode("");
    setKabupatenNama("");
    setKecamatanNama("");
  }

  function pilihKabupaten(e) {
    const kode = e.target.value;
    const nama = e.target.options[e.target.selectedIndex]?.text || "";
    setKabupatenKode(kode);
    setKabupatenNama(kode ? nama : "");
    setKecamatanNama("");
  }

  function pilihKecamatan(e) {
    const nama = e.target.options[e.target.selectedIndex]?.text || "";
    setKecamatanNama(e.target.value ? nama : "");
  }

  function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setHapusFoto(false);
    }
  }

  function handleHapusFoto() {
    setPreview(null);
    setHapusFoto(true);
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewLogo(URL.createObjectURL(file));
      setHapusLogo(false);
    }
  }

  function handleHapusLogo() {
    setPreviewLogo(null);
    setHapusLogo(true);
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Preview persis tampilan hero beranda */}
      <div>
        <Label>Pratinjau tampilan beranda</Label>
        <div className="relative overflow-hidden rounded-2xl bg-navy-dark">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-navy-dark/70" />
          <div className="relative px-6 py-14 text-center sm:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
              {jenisWilayah} {kecamatanNama && `· Kec. ${kecamatanNama}`}
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
              {namaDesa || "Nama Desa/Kelurahan"}
            </h1>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              {[kecamatanNama && `Kec. ${kecamatanNama}`, kabupatenNama && `Kab. ${kabupatenNama}`, provinsiNama && `Prov. ${provinsiNama}`]
                .filter(Boolean)
                .join(", ") || "Kecamatan, Kabupaten, Provinsi"}
            </p>
            {alamat && <p className="mt-1 text-xs text-white/50">{alamat}</p>}
          </div>
        </div>
      </div>

      {/* Nama & jenis wilayah */}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <Label>Status wilayah</Label>
          <select
            name="jenis_wilayah"
            value={jenisWilayah}
            onChange={(e) => setJenisWilayah(e.target.value)}
            className={inputClass}
          >
            <option value="Desa">Desa</option>
            <option value="Kelurahan">Kelurahan</option>
          </select>
        </div>
        <div>
          <Label>Nama desa/kelurahan</Label>
          <input
            type="text"
            name="nama_desa"
            required
            value={namaDesa}
            onChange={(e) => setNamaDesa(e.target.value)}
            placeholder="mis. Tatakalai"
            className={inputClass}
          />
        </div>
      </div>

      {/* Wilayah administratif */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Wilayah administratif</p>
          <button
            type="button"
            onClick={() => setManual((v) => !v)}
            className="text-xs text-navy underline"
          >
            {manual ? "Pakai dropdown" : "Isi manual"}
          </button>
        </div>

        {gagalMuatWilayah && (
          <p className="mb-3 text-xs text-amber-600">
            Daftar wilayah tidak bisa dimuat (butuh koneksi internet) — silakan isi manual.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Provinsi</Label>
            {manual ? (
              <input
                type="text"
                name="provinsi"
                value={provinsiNama}
                onChange={(e) => setProvinsiNama(e.target.value)}
                placeholder="mis. Sulawesi Tengah"
                className={inputClass}
              />
            ) : (
              <>
                <select value={provinsiKode} onChange={pilihProvinsi} className={inputClass}>
                  <option value="">Pilih provinsi...</option>
                  {provinsiList.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="provinsi" value={provinsiNama} />
              </>
            )}
          </div>

          <div>
            <Label>Kabupaten/Kota</Label>
            {manual ? (
              <input
                type="text"
                name="kabupaten"
                value={kabupatenNama}
                onChange={(e) => setKabupatenNama(e.target.value)}
                placeholder="mis. Banggai Kepulauan"
                className={inputClass}
              />
            ) : (
              <>
                <select
                  value={kabupatenKode}
                  onChange={pilihKabupaten}
                  disabled={!provinsiKode}
                  className={inputClass}
                >
                  <option value="">
                    {provinsiKode ? "Pilih kabupaten/kota..." : "Pilih provinsi dulu"}
                  </option>
                  {kabupatenList.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="kabupaten" value={kabupatenNama} />
              </>
            )}
          </div>

          <div>
            <Label>Kecamatan</Label>
            {manual ? (
              <input
                type="text"
                name="kecamatan"
                value={kecamatanNama}
                onChange={(e) => setKecamatanNama(e.target.value)}
                placeholder="mis. Tinangkung"
                className={inputClass}
              />
            ) : (
              <>
                <select
                  key={kabupatenKode}
                  onChange={pilihKecamatan}
                  defaultValue={
                    kecamatanList.find((k) => k.name === kecamatanNama)?.code ?? ""
                  }
                  disabled={!kabupatenKode}
                  className={inputClass}
                >
                  <option value="">
                    {kabupatenKode ? "Pilih kecamatan..." : "Pilih kabupaten dulu"}
                  </option>
                  {kecamatanList.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="kecamatan" value={kecamatanNama} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alamat */}
      <div>
        <Label>Alamat kantor desa</Label>
        <textarea
          name="alamat"
          rows={2}
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="mis. Jl. Poros Desa Tatakalai No. 1"
          className={inputClass}
        />
      </div>

      {/* Foto latar beranda */}
      <div>
        <Label>Foto latar beranda (background hero)</Label>
        <p className="mb-2 text-xs text-slate-400">
          Format JPG/PNG/WEBP, maksimal 8MB. Foto akan tampil sebagai latar belakang identitas
          desa di halaman utama.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFotoChange}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
          />
          {preview && (
            <button
              type="button"
              onClick={handleHapusFoto}
              className="text-xs text-red-600 underline"
            >
              Hapus foto
            </button>
          )}
        </div>
        {hapusFoto && (
          <input type="hidden" name="hapus_foto" value="1" />
        )}
      </div>

      {/* Logo desa */}
      <div>
        <Label>Logo desa/kelurahan</Label>
        <p className="mb-2 text-xs text-slate-400">
          Format JPG/PNG/WEBP, maksimal 8MB. Logo ini akan tampil di header situs (pojok kiri
          atas, menggantikan logo aplikasi) dan di lambang halaman utama. Kalau belum diunggah,
          sistem tetap memakai logo aplikasi SI-LIPU sebagai identitas bawaan — termasuk di layar
          pembuka (splash) aplikasi, yang tidak terpengaruh pengaturan ini.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {previewLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewLogo}
              alt=""
              className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1"
            />
          )}
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoChange}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
          />
          {previewLogo && (
            <button
              type="button"
              onClick={handleHapusLogo}
              className="text-xs text-red-600 underline"
            >
              Hapus logo
            </button>
          )}
        </div>
        {hapusLogo && (
          <input type="hidden" name="hapus_logo" value="1" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <TombolSimpan />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">Pengaturan desa tersimpan.</p>}
      </div>
    </form>
  );
}
