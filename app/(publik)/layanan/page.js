import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconMail, IconMessage, IconMegaphone, IconUsers, IconArrowRight } from "@/components/icons";
import SpotlightCard from "@/components/SpotlightCard";

const ICON_MAP = {
  mail: IconMail,
  message: IconMessage,
  megaphone: IconMegaphone,
  users: IconUsers,
};

export default async function DaftarLayananPage() {
  const supabase = await createClient();
  const { data: daftarLayanan } = await supabase
    .from("jenis_layanan_master")
    .select("id, nama_layanan, kategori, icon, deskripsi")
    .eq("aktif", true)
    .order("kategori");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-royal">
            Tanpa Akun, Tanpa Antre
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Ajukan Layanan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pilih jenis layanan yang Anda butuhkan.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(daftarLayanan || []).map((layanan) => {
            const Icon = ICON_MAP[layanan.icon] || IconMail;
            return (
              <SpotlightCard key={layanan.id} className="rounded-2xl">
                <Link
                  href={`/layanan/ajukan/${layanan.id}`}
                  className="bingkai-gradasi group flex h-full items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-gold-light shadow-md shadow-navy/20 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-semibold text-slate-800">
                      {layanan.nama_layanan}
                    </h3>
                    {layanan.deskripsi && (
                      <p className="mt-1 text-sm text-slate-500">{layanan.deskripsi}</p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-navy">
                      Mulai ajukan
                      <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            );
          })}
        </div>

        {(!daftarLayanan || daftarLayanan.length === 0) && (
          <p className="text-center text-sm text-slate-400">
            Belum ada layanan yang aktif. Hubungi kantor desa.
          </p>
        )}

        <div className="mt-8 text-center">
          <Link href="/layanan/cek" className="text-sm text-navy underline">
            Sudah punya kode tracking? Cek status di sini
          </Link>
        </div>
        <div className="mt-2 text-center">
          <Link href="/layanan/riwayat" className="text-sm text-navy underline">
            Lupa kode? Lihat riwayat ajuan saya
          </Link>
        </div>
        <div className="mt-2 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
