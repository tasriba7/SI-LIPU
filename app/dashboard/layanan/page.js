import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import { linkWhatsApp } from "@/lib/whatsapp";
import { bisaTerbitkanSurat, bisaMenulis, isAdminRole } from "@/lib/roles";
import { IconPlus } from "@/components/icons";
import TabelPengajuan from "./TabelPengajuan";

const FILTER = ["semua", "diajukan", "diproses", "selesai", "ditolak"];
const BATAS = 200;

function lamaTunggu(iso) {
  const jam = Math.floor((Date.now() - new Date(iso).getTime()) / 36e5);
  if (jam < 1) return "baru saja";
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

export default async function DaftarPengajuanLayananPage({ searchParams }) {
  const sp = await searchParams;
  const status = FILTER.includes(sp?.status) ? sp.status : "semua";
  // Buang karakter yang bisa merusak filter .or() PostgREST.
  const q = (sp?.q ?? "").trim().replace(/[,()%*]/g, " ").slice(0, 60);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const bolehBuatSurat = bisaTerbitkanSurat(profil?.role);
  const bolehUbah = bisaMenulis(profil?.role); // reset (semua staf kecuali Kepala Desa)
  const bolehHapus = isAdminRole(profil?.role); // hapus permanen: admin saja

  let query = supabase
    .from("pengajuan_layanan")
    .select(
      "id, kode_tracking, anonim, nama_pemohon, nik, no_hp, status, created_at, jenis_layanan_master(nama_layanan)"
    )
    .order("created_at", { ascending: false })
    .limit(BATAS);

  if (status !== "semua") query = query.eq("status", status);
  if (q) {
    query = query.or(
      `kode_tracking.ilike.%${q}%,nama_pemohon.ilike.%${q}%,nik.ilike.%${q}%`
    );
  }

  const hitung = (s) =>
    supabase
      .from("pengajuan_layanan")
      .select("id", { count: "exact", head: true })
      .eq("status", s);

  const [{ data: daftar }, ...counts] = await Promise.all([
    query,
    ...["diajukan", "diproses", "selesai", "ditolak"].map(hitung),
  ]);
  const jumlah = {
    diajukan: counts[0].count ?? 0,
    diproses: counts[1].count ?? 0,
    selesai: counts[2].count ?? 0,
    ditolak: counts[3].count ?? 0,
  };

  // Data ringkas & serializable untuk komponen klien (tabel dengan kotak centang).
  const rows = (daftar ?? []).map((row) => ({
    id: row.id,
    kode: row.kode_tracking,
    layanan: row.jenis_layanan_master?.nama_layanan ?? "",
    nama: row.nama_pemohon ?? "",
    anonim: !!row.anonim,
    status: row.status,
    masuk: lamaTunggu(row.created_at),
    masukLengkap: new Date(row.created_at).toLocaleString("id-ID"),
    // Pengaduan anonim: tidak ada nama/HP, jadi tidak ada tombol WhatsApp.
    wa: row.anonim
      ? null
      : linkWhatsApp(
          row.no_hp,
          `Halo ${row.nama_pemohon}, ini kantor desa terkait pengajuan ${row.kode_tracking}.`
        ),
  }));

  const hrefFilter = (f) => {
    const p = new URLSearchParams();
    if (f !== "semua") p.set("status", f);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/dashboard/layanan?${s}` : "/dashboard/layanan";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Pengajuan Layanan</h1>
          <p className="text-sm text-slate-500">
            Semua pengajuan warga, terbaru di atas. Klik kode untuk memproses.
          </p>
        </div>
        {bolehBuatSurat && (
          <Link
            href="/dashboard/layanan/buat"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            <IconPlus className="h-4 w-4" />
            Buat Surat Langsung
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.keys(jumlah).map((s) => (
          <Link
            key={s}
            href={hrefFilter(s)}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-2xl font-bold text-slate-800">{jumlah[s]}</p>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[s]}`}
            >
              {STATUS_LABELS[s]}
            </span>
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/dashboard/layanan">
        {status !== "semua" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari kode, nama, atau NIK…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
          Cari
        </button>
        {q && (
          <Link href={hrefFilter(status).replace(/[?&]q=[^&]*/, "")} className="text-sm text-slate-400 hover:text-slate-600">
            Reset
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTER.map((f) => (
          <Link
            key={f}
            href={hrefFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === f
                ? "bg-navy text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:border-navy-light/40"
            }`}
          >
            {f === "semua" ? "Semua" : STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      <TabelPengajuan
        rows={rows}
        bolehUbah={bolehUbah}
        bolehHapus={bolehHapus}
        pesanKosong={`Belum ada pengajuan${
          status !== "semua" ? ` dengan status "${STATUS_LABELS[status]}"` : ""
        }${q ? ` untuk "${q}"` : ""}.`}
      />
      {(daftar ?? []).length === BATAS && (
        <p className="text-xs text-slate-400">
          Menampilkan {BATAS} terbaru. Gunakan pencarian atau filter untuk mempersempit.
        </p>
      )}
    </div>
  );
}
