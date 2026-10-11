import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole, ROLE_LABELS } from "@/lib/roles";
import PilihMassal from "./PilihMassal";
import FormBuatAkun from "./FormBuatAkun";
import BarisPendaftaran from "../pendaftaran/BarisPendaftaran";
import SetujuiSemua from "../pendaftaran/SetujuiSemua";
import TombolHapusRiwayat from "../pendaftaran/TombolHapusRiwayat";
import HapusSemuaRiwayat from "../pendaftaran/HapusSemuaRiwayat";

const TAB_VALID = ["akun", "pendaftaran", "baru"];

async function ambilSemuaAuthUsers(adminClient) {
  // auth.admin.listUsers dipaginasi; ambil semua halaman (staf desa jumlahnya
  // kecil, jadi cukup aman looping sampai habis).
  const semua = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    semua.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return semua;
}

function Tab({ href, aktif, children, badge }) {
  return (
    <Link
      href={href}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        aktif
          ? "border-navy text-navy"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default async function KelolaAkunPage({ searchParams }) {
  const { tab: tabParam } = await searchParams;
  const tab = TAB_VALID.includes(tabParam) ? tabParam : "akun";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileSaya } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (!isAdminRole(profileSaya?.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Halaman Terbatas</h1>
        <p className="mt-2 text-sm text-amber-700">
          Halaman ini hanya bisa diakses oleh Administrator, karena berkaitan
          dengan akun dan password login perangkat desa lain. Hubungi
          Administrator desa kalau Anda perlu bantuan.
        </p>
      </div>
    );
  }

  // Pendaftaran selalu dimuat: jumlah yang menunggu tampil sebagai badge di tab,
  // apa pun tab yang sedang dibuka.
  const { data: daftarPendaftaran } = await supabase
    .from("pendaftaran_akun")
    .select("*, posisi_perangkat(role, wilayah, status)")
    .order("tanggal_daftar", { ascending: false });
  const pending = (daftarPendaftaran || []).filter((d) => d.status === "pending");
  const selesai = (daftarPendaftaran || []).filter((d) => d.status !== "pending");

  // Daftar akun aktif hanya dimuat saat tab-nya dibuka. Diambil pakai admin
  // client (melewati RLS): tabel profiles hanya mengizinkan staf melihat baris
  // miliknya sendiri. Aman karena akses halaman ini sudah dibatasi ke admin di
  // atas (server-side).
  let daftar = [];
  let error = null;
  let errAuth = null;
  if (tab === "akun") {
    try {
      const adminClient = createAdminClient();

      const { data: profiles, error: errProfiles } = await adminClient
        .from("profiles")
        .select("id, nama, role, jabatan, dusun, created_at")
        .order("role")
        .order("nama");
      if (errProfiles) error = errProfiles;

      const authUsers = await ambilSemuaAuthUsers(adminClient);
      const emailById = new Map(authUsers.map((u) => [u.id, u.email]));
      // Jumlah data penduduk yang diinput tiap akun, ditampilkan di konfirmasi
      // hapus supaya admin tahu data itu tetap aman.
      const jumlahWargaById = new Map();
      for (const p of profiles ?? []) {
        const { count } = await adminClient
          .from("warga")
          .select("id", { count: "exact", head: true })
          .eq("dibuat_oleh", p.id);
        jumlahWargaById.set(p.id, count ?? 0);
      }

      daftar = (profiles ?? []).map((p) => ({
        ...p,
        email: emailById.get(p.id) || "-",
        bisaDihapus: p.id !== user?.id,
        jumlahWarga: jumlahWargaById.get(p.id) ?? 0,
      }));
    } catch (e) {
      errAuth = e.message;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Akun Staf</h1>
        <p className="text-sm text-slate-500">
          Semua urusan akun perangkat desa ada di sini: melihat akun yang aktif,
          menyetujui pendaftaran, dan membuat akun baru.
        </p>
      </div>

      <nav className="flex flex-wrap border-b border-slate-200" aria-label="Bagian Akun Staf">
        <Tab href="/dashboard/kelola-akun" aktif={tab === "akun"}>
          Akun Aktif
        </Tab>
        <Tab
          href="/dashboard/kelola-akun?tab=pendaftaran"
          aktif={tab === "pendaftaran"}
          badge={pending.length}
        >
          Pendaftaran Masuk
        </Tab>
        <Tab href="/dashboard/kelola-akun?tab=baru" aktif={tab === "baru"}>
          Buat Akun Baru
        </Tab>
      </nav>

      {tab === "akun" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Atur ulang password (satu per satu atau banyak sekaligus) dan hapus
            akun staf yang sudah tidak bertugas.
          </p>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              Gagal memuat daftar profil: {error.message}
            </p>
          )}
          {errAuth && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              Gagal memuat data email akun: {errAuth}
            </p>
          )}
          <PilihMassal daftar={daftar} />
        </div>
      )}

      {tab === "pendaftaran" && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-sm text-slate-500">
              Kepala Dusun dan Ketua RT mendaftar sendiri lewat halaman
              pendaftaran publik, untuk slot yang sudah Anda buka. Di sini Anda
              hanya menyetujui atau menolak. Slot yang sudah terisi otomatis
              ditolak sistem sebelum masuk.
            </p>
            <Link
              href="/dashboard/posisi"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Atur slot posisi &rarr;
            </Link>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-600">
              Menunggu Persetujuan ({pending.length})
            </h2>
            {pending.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada pendaftaran menunggu.</p>
            )}
            <SetujuiSemua jumlahPending={pending.length} />
            <div className="space-y-3">
              {pending.map((p) => (
                <BarisPendaftaran key={p.id} pendaftaran={p} />
              ))}
            </div>
          </section>

          {selesai.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-600">Riwayat</h2>
                <HapusSemuaRiwayat jumlah={selesai.length} />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nama</th>
                      <th className="px-4 py-3 font-medium">Posisi</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selesai.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-slate-700">{p.nama_lengkap}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {ROLE_LABELS[p.posisi_perangkat?.role]} — {p.posisi_perangkat?.wilayah}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              p.status === "disetujui"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status === "disetujui" ? "Disetujui" : "Ditolak"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <TombolHapusRiwayat id={p.id} nama={p.nama_lengkap} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "baru" && <FormBuatAkun />}
    </div>
  );
}
