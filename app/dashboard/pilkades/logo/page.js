import { redirect } from "next/navigation";

// Alamat lama. Menu digabung; halaman ini hanya mengalihkan (isi query ikut terbawa).
export default async function Alihkan({ searchParams }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp ?? {})) {
    for (const x of [].concat(v ?? [])) q.append(k, String(x));
  }
  const s = q.toString();
  redirect(`/dashboard/pilkades/pengaturan/logo${s ? `?${s}` : ""}`);
}
