import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-navy">
              Halo, {profile?.nama ?? user.email}
            </h1>
            <p className="text-sm text-slate-500">
              Login sebagai{" "}
              <span className="font-medium">{profile?.role ?? "admin"}</span>
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Keluar
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Dashboard admin desa — placeholder Fase 1. Modul pengelolaan
            pengajuan surat, pengaduan warga, dan pengumuman akan tampil di
            sini pada fase berikutnya.
          </p>
        </div>
      </div>
    </main>
  );
}
