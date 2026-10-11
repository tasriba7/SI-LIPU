import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPilihanDusun } from "@/lib/wilayah";
import FormTambahKeluarga from "./FormTambahKeluarga";

export const metadata = { title: "Tambah Data Keluarga" };

// Dua cara membuka halaman ini:
//   /dashboard/kependudukan/tambah             -> keluarga BARU (seperti biasa)
//   /dashboard/kependudukan/tambah?kk=<16 digit> -> tambah ANGGOTA ke keluarga
//                                                   yang sudah ada (No. KK & alamat
//                                                   terkunci, tidak perlu diketik ulang)
//
// Penyimpanan tetap lewat action `tambahKeluargaWarga` yang sama; tidak ada
// logika simpan baru di sini. Halaman ini hanya membaca data keluarga untuk
// ditampilkan (dibatasi RLS sesuai akun yang login).
export default async function TambahWargaPage({ searchParams }) {
  const sp = await searchParams;
  const kk = typeof sp?.kk === "string" ? sp.kk.trim() : "";
  const supabase = await createClient();

  // --- Mode biasa: keluarga baru ---
  if (!kk) {
    const { pilihan, terkunci } = await ambilPilihanDusun(supabase);
    return <FormTambahKeluarga pilihanDusun={pilihan} dusunTerkunci={terkunci} />;
  }

  // --- Mode tambah anggota: No. KK harus valid & keluarganya harus ada ---
  const pesanTidakAda = (judul, isi) => (
    <div className="max-w-2xl space-y-4">
      <Link href="/dashboard/kependudukan/kartu-keluarga" className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Kembali ke Kartu Keluarga
      </Link>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">{judul}</p>
        <p className="mt-0.5">{isi}</p>
      </div>
      <p className="text-sm text-slate-500">
        Untuk mendaftarkan keluarga yang benar-benar baru, gunakan{" "}
        <Link href="/dashboard/kependudukan/tambah" className="font-medium text-navy underline">
          Tambah Data Keluarga
        </Link>
        .
      </p>
    </div>
  );

  if (!/^\d{16}$/.test(kk)) {
    return pesanTidakAda("No. KK tidak valid.", "No. KK harus berupa 16 digit angka.");
  }

  const [{ data: keluarga }, { data: anggota }] = await Promise.all([
    supabase.from("keluarga").select("no_kk, alamat, dusun, rt, rw").eq("no_kk", kk).maybeSingle(),
    supabase
      .from("warga")
      .select("nama_lengkap, status_dalam_kk, alamat, dusun, rt, rw")
      .eq("no_kk", kk)
      .eq("status_kependudukan", "aktif"),
  ]);

  // Kosong bisa berarti: No. KK tidak ada, atau keluarganya di luar wilayah
  // akun ini (Kadus/Ketua RT dibatasi RLS). Sengaja TIDAK jatuh ke form
  // keluarga baru, supaya salah ketik No. KK tidak diam-diam membuat keluarga baru.
  if (!anggota || anggota.length === 0) {
    return pesanTidakAda(
      "Keluarga dengan No. KK ini tidak ditemukan.",
      "Pastikan No. KK benar, atau keluarga ini berada di luar wilayah tugas Anda."
    );
  }

  const kepala = anggota.find((a) => a.status_dalam_kk === "Kepala Keluarga") ?? null;
  const dari = (k) => keluarga?.[k] || anggota.find((a) => a[k])?.[k] || null;

  return (
    <FormTambahKeluarga
      keluargaAda={{
        no_kk: kk,
        namaKepala: kepala?.nama_lengkap ?? null,
        adaKepala: Boolean(kepala),
        jumlahAnggota: anggota.length,
        alamat: dari("alamat"),
        dusun: dari("dusun"),
        rt: dari("rt"),
        rw: dari("rw"),
      }}
    />
  );
}
