import {
  ROLE_LABELS,
  terimaPemberitahuanLayanan,
  isBpdRole,
  bisaTerbitkanSurat,
} from "@/lib/roles";
import { ambilRingkasanPelayanan } from "@/lib/ringkasanPelayanan";
import RingkasanPelayanan from "@/components/dashboard/RingkasanPelayanan";
import { ambilPemberitahuanLayanan } from "@/lib/pemberitahuanLayanan";
import PemberitahuanLayanan from "@/components/dashboard/PemberitahuanLayanan";
import Link from "next/link";
import { redirect } from "next/navigation";
import { grupUntukRole } from "@/lib/menuDashboard";
import { createClient } from "@/lib/supabase/server";
import { ringkasKolomKosong } from "@/lib/kelengkapan";
import {
  getStatistikBeranda,
  getStatistikBerandaDetail,
  getStatistikPerDusun,
} from "@/lib/statistikBeranda";
import StatistikDashboard from "@/components/dashboard/StatistikDashboard";

function KartuModul({ nama, deskripsi, icon: Icon, href }) {
  const isi = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-dark/5 text-navy-dark">
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-800">{nama}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{deskripsi}</p>
      </div>
      {!href && (
        <span className="mt-3 inline-block w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          segera
        </span>
      )}
    </>
  );

  const className =
    "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm";

  if (!href) {
    return <div className={`${className} cursor-not-allowed opacity-70`}>{isi}</div>;
  }

  return (
    <Link href={href} className={className}>
      {isi}
    </Link>
  );
}

// Label peran penginput. Kadus/Ketua RT dipersingkat; peran lain pakai label
// resmi dari lib/roles (mis. "Administrator", "Kepala Desa"), bukan teks mentah.
function labelRolePenginput(role) {
  if (role === "kadus") return "Kadus";
  if (role === "ketua_rt") return "Ketua RT";
  return ROLE_LABELS[role] ?? role ?? "";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Peran akun yang sedang login: menentukan isi beranda dan kartu modul.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profilSaya } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const peran = profilSaya?.role ?? null;
  if (peran === "panitia_pilkades") redirect("/dashboard/pilkades");
  // Kartu modul dikelompokkan sama persis dengan sidebar (lib/menuDashboard.js).
  const grupModul = grupUntukRole(peran);

  // Isi beranda berbeda per peran:
  //  * pemantau  (Kepala Desa, Anggota BPD): ringkasan pelayanan & pengaduan.
  //              Tidak mengurus pengisian data, jadi tanpa banner "data belum
  //              lengkap" dan tanpa rincian per penginput.
  //  * pemroses  (admin, Sekretaris, Kaur, Kasi): pengajuan yang menunggu
  //              diproses + data belum lengkap se-desa.
  //  * wilayah   (Kadus, Ketua RT): data belum lengkap di wilayahnya sendiri
  //              (dibatasi RLS); Ketua RT juga menerima pemberitahuan.
  const bpd = isBpdRole(peran);
  const kades = peran === "kepala_desa";
  const pemantau = bpd || kades;
  const pemroses = bisaTerbitkanSurat(peran);
  const tampilKelengkapan = !pemantau;

  // Statistik kependudukan (angka agregat; sama dengan beranda publik).
  const [statRingkas, statDetail, statDusun] = await Promise.all([
    getStatistikBeranda(),
    getStatistikBerandaDetail(),
    getStatistikPerDusun(),
  ]);

  // Ringkasan data warga belum lengkap PER PENGINPUT (hanya untuk yang
  // mengisi data: staf desa melihat semua wilayah, Kadus/Ketua RT wilayahnya).
  let ringkasanKelengkapan = null;
  let kolomTersering = null;
  if (tampilKelengkapan) {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase
        .from("ringkasan_kelengkapan_penginput")
        .select("dibuat_oleh, nama, role, wilayah, total, belum_lengkap")
        .gt("belum_lengkap", 0)
        .order("belum_lengkap", { ascending: false })
        .limit(8),
      supabase
        .from("ringkasan_kolom_kosong")
        .select("kolom, jumlah")
        .order("jumlah", { ascending: false })
        .limit(5),
    ]);
    ringkasanKelengkapan = a;
    kolomTersering = b;
  }

  // Pengajuan menunggu: hanya untuk yang memang memprosesnya.
  let menunggu = 0;
  if (pemroses) {
    const { count } = await supabase
      .from("pengajuan_layanan")
      .select("id", { count: "exact", head: true })
      .eq("status", "diajukan");
    menunggu = count ?? 0;
  }

  // Kepala Desa & Ketua RT: pemberitahuan pengajuan baru (siapa yang mengajukan;
  // pengaduan anonim tanpa identitas).
  const adaPemberitahuan = terimaPemberitahuanLayanan(peran);
  const pemberitahuan = adaPemberitahuan
    ? await ambilPemberitahuanLayanan(supabase, peran, { tampil: 8 })
    : null;

  // Kepala Desa & Anggota BPD: ringkasan pelayanan (hanya angka).
  const ringkasanPelayanan = pemantau
    ? await ambilRingkasanPelayanan(supabase, bpd ? "pantau" : "langsung")
    : null;

  const totalBelumLengkap = (ringkasanKelengkapan ?? []).reduce(
    (a, r) => a + (r.belum_lengkap || 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {pemantau
            ? "Ringkasan pelayanan dan data kependudukan desa."
            : "Pilih modul di bawah untuk mulai bekerja."}
        </p>
      </div>

      {pemberitahuan && <PemberitahuanLayanan {...pemberitahuan} />}

      {ringkasanPelayanan && (
        <RingkasanPelayanan
          ringkasan={ringkasanPelayanan}
          hrefLayanan="/dashboard/layanan"
          hrefPengaduan={bpd ? "/dashboard/pengaduan" : "/dashboard/layanan"}
        />
      )}

      {pemroses && menunggu > 0 && (
        <Link
          href="/dashboard/layanan?status=diajukan"
          className="flex items-center justify-between gap-4 rounded-2xl border border-gold/50 bg-gold/10 p-5 transition hover:shadow-md"
        >
          <div>
            <h2 className="text-sm font-bold text-navy">
              {menunggu} pengajuan layanan menunggu diproses
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Klik untuk membuka daftar pengajuan baru.
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white">
            Proses sekarang
          </span>
        </Link>
      )}

      {tampilKelengkapan && ringkasanKelengkapan && ringkasanKelengkapan.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-amber-800">
                ⚠ Ada {totalBelumLengkap} data kependudukan yang belum lengkap
              </h2>
              <p className="mt-1 text-xs text-amber-700">
                Rincian per penginput di bawah ini. Klik "Data Kependudukan" untuk
                membuka dan melengkapi.
              </p>
            </div>
            <Link
              href="/dashboard/kependudukan?kurang=1"
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Lihat & lengkapi
            </Link>
          </div>

          <div className="mt-3 divide-y divide-amber-100 overflow-hidden rounded-xl border border-amber-100 bg-white">
            {ringkasanKelengkapan.map((r) => (
              <div
                key={r.dibuat_oleh ?? "tanpa-penginput"}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">
                    {r.nama || "Data lama / impor (penginput tidak tercatat)"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[
                      labelRolePenginput(r.role),
                      r.wilayah,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {r.belum_lengkap} dari {r.total} data
                </span>
              </div>
            ))}
          </div>

          {kolomTersering && kolomTersering.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              Kolom paling sering kosong: {ringkasKolomKosong(kolomTersering.map((k) => k.kolom), 5)}.
            </p>
          )}
        </div>
      )}

      <StatistikDashboard
        ringkas={statRingkas}
        detail={statDetail}
        perDusun={statDusun}
      />

      {grupModul.map((g) => (
        <section key={g.kunci}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {g.judul}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.item.map(({ akses: _akses, ...modul }) => (
              <KartuModul key={modul.nama} {...modul} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
