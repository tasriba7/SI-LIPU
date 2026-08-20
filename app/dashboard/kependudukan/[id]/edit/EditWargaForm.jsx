"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editWarga } from "../../actions";
import { PEKERJAAN_OPTIONS } from "@/lib/pekerjaanOptions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  );
}

export default function EditWargaForm({ warga }) {
  const router = useRouter();
  const [state, formAction] = useActionState(editWarga, {});

  // Data lama mungkin masih berupa teks bebas (sebelum kolom ini jadi
  // dropdown) — kalau nilainya tidak ada di daftar standar, tetap
  // tampilkan sebagai opsi tambahan supaya data lama tidak hilang/kosong
  // saat form dibuka.
  const pekerjaanTersimpan = warga.pekerjaan || "";
  const pekerjaanOpsiLengkap =
    pekerjaanTersimpan && !PEKERJAAN_OPTIONS.includes(pekerjaanTersimpan)
      ? [pekerjaanTersimpan, ...PEKERJAAN_OPTIONS]
      : PEKERJAAN_OPTIONS;

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/kependudukan");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <input type="hidden" name="id" value={warga.id} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
          <input
            type="text"
            name="nik"
            required
            maxLength={16}
            inputMode="numeric"
            pattern="\d{16}"
            defaultValue={warga.nik}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">No. KK</label>
          <input
            type="text"
            name="no_kk"
            maxLength={16}
            defaultValue={warga.no_kk || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Nama lengkap</label>
        <input
          type="text"
          name="nama_lengkap"
          required
          defaultValue={warga.nama_lengkap}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Tempat lahir</label>
          <input
            type="text"
            name="tempat_lahir"
            defaultValue={warga.tempat_lahir || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Tanggal lahir</label>
          <input
            type="date"
            name="tanggal_lahir"
            required
            defaultValue={warga.tanggal_lahir || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Jenis kelamin</label>
          <select
            name="jenis_kelamin"
            defaultValue={warga.jenis_kelamin || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="" disabled>
              Pilih
            </option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Status kawin</label>
          <select
            name="status_kawin"
            defaultValue={warga.status_kawin || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="" disabled>
              Pilih
            </option>
            <option value="Belum Kawin">Belum Kawin</option>
            <option value="Kawin">Kawin</option>
            <option value="Cerai Hidup">Cerai Hidup</option>
            <option value="Cerai Mati">Cerai Mati</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Status dalam Kartu Keluarga</label>
        <select
          name="status_dalam_kk"
          defaultValue={warga.status_dalam_kk || ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          <option value="" disabled>
            Pilih
          </option>
          <option value="Kepala Keluarga">Kepala Keluarga</option>
          <option value="Istri">Istri</option>
          <option value="Anak">Anak</option>
          <option value="Famili Lain">Famili Lain</option>
          <option value="Lainnya">Lainnya</option>
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Dipakai untuk hitung jumlah kepala keluarga di kartu statistik beranda.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Alamat</label>
        <textarea
          name="alamat"
          rows={2}
          defaultValue={warga.alamat || ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Dusun</label>
          <input
            type="text"
            name="dusun"
            defaultValue={warga.dusun || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">RT</label>
          <input
            type="text"
            name="rt"
            defaultValue={warga.rt || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">RW</label>
          <input
            type="text"
            name="rw"
            defaultValue={warga.rw || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">
          No. HP / WhatsApp <span className="text-slate-400">(opsional)</span>
        </label>
        <input
          type="tel"
          name="no_hp"
          placeholder="Mis. 08xxxxxxxxxx"
          defaultValue={warga.no_hp || ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <p className="mt-1 text-xs text-slate-400">Nomor telepon biasa atau nomor Whatsapp.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Pekerjaan</label>
          <select
            name="pekerjaan"
            defaultValue={pekerjaanTersimpan}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="" disabled>
              Pilih
            </option>
            {pekerjaanOpsiLengkap.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Agama</label>
          <select
            name="agama"
            defaultValue={warga.agama || ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="" disabled>
              Pilih
            </option>
            <option>Islam</option>
            <option>Kristen Protestan</option>
            <option>Katolik</option>
            <option>Hindu</option>
            <option>Buddha</option>
            <option>Konghucu</option>
            <option>Lainnya</option>
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <TombolSimpan />
        <Link href="/dashboard/kependudukan" className="text-sm text-slate-500 hover:text-slate-700">
          Batal
        </Link>
      </div>
    </form>
  );
}
