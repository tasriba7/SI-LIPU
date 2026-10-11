import { redirect } from "next/navigation";

// Halaman ini sudah digabung ke Akun Staf (tab "Pendaftaran Masuk"). Alamat
// lama dipertahankan supaya bookmark/tautan lama tetap bekerja.
export default function PendaftaranAkunPage() {
  redirect("/dashboard/kelola-akun?tab=pendaftaran");
}
