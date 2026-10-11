"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { idKeturunan } from "@/lib/strukturOrganisasi";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function segarkan() {
  revalidatePath("/dashboard/struktur-organisasi");
  revalidatePath("/struktur-organisasi");
  revalidatePath("/");
}

function namaFileDariUrl(url) {
  return url ? url.split("/").pop() : null;
}

/** Urutan berikutnya (paling kanan) di antara saudara dengan atasan yang sama. */
async function urutanBerikut(supabase, atasanId) {
  let q = supabase.from("struktur_organisasi").select("urutan").order("urutan", { ascending: false }).limit(1);
  q = atasanId ? q.eq("atasan_id", atasanId) : q.is("atasan_id", null);
  const { data } = await q;
  return (data?.[0]?.urutan ?? -1) + 1;
}

/** Tambah (tanpa `id`) atau ubah (dengan `id`) satu jabatan di struktur organisasi. */
export async function simpanStruktur(prevState, formData) {
  const id = formData.get("id")?.toString() || null;
  const teks = (k, maks) => (formData.get(k)?.toString().trim() || "").slice(0, maks);

  const nama = teks("nama", 120);
  const jabatan = teks("jabatan", 120);
  const atasanMentah = teks("atasan_id", 60);
  const atasanId = atasanMentah || null;
  const aktif = formData.get("aktif") === "on";
  const foto = formData.get("foto");
  const adaFoto = foto && typeof foto === "object" && foto.size > 0;

  if (!nama) return { error: "Nama wajib diisi." };
  if (!jabatan) return { error: "Jabatan wajib diisi." };
  if (atasanId && !UUID.test(atasanId)) return { error: "Atasan tidak valid." };
  if (id && !UUID.test(id)) return { error: "Data tidak valid." };

  if (adaFoto) {
    const ekstensi = (foto.name?.split(".").pop() || "").toLowerCase();
    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) return { error: "Format foto harus JPG, PNG, atau WEBP." };
    if (foto.size > UKURAN_MAKS_MB * 1024 * 1024) return { error: `Ukuran foto maksimal ${UKURAN_MAKS_MB}MB.` };
  }

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  let lama = null;
  if (id) {
    const { data } = await supabase
      .from("struktur_organisasi")
      .select("foto_url, atasan_id")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { error: "Data tidak ditemukan." };
    lama = data;

    // Atasan tidak boleh diri sendiri atau salah satu bawahannya (bagan melingkar).
    if (atasanId) {
      const { data: semua } = await supabase.from("struktur_organisasi").select("id, atasan_id");
      if (idKeturunan(semua || [], id).has(atasanId)) {
        return { error: "Atasan tidak boleh diri sendiri atau bawahannya sendiri." };
      }
    }
  }

  const data = { nama, jabatan, atasan_id: atasanId, aktif };

  // Pindah atasan (atau data baru) -> taruh di paling kanan antar-saudara barunya.
  if (!id || (lama.atasan_id ?? null) !== atasanId) {
    data.urutan = await urutanBerikut(supabase, atasanId);
  }

  let namaFileBaru = null;
  if (adaFoto) {
    const ekstensi = (foto.name.split(".").pop() || "").toLowerCase();
    namaFileBaru = `struktur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ekstensi}`;
    const { error: errUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFileBaru, foto, { upsert: false, contentType: foto.type || undefined });
    if (errUpload) return { error: "Gagal mengunggah foto: " + errUpload.message };
    data.foto_url = supabase.storage.from("desa-media").getPublicUrl(namaFileBaru).data.publicUrl;
  }

  let error;
  if (id) {
    ({ error } = await supabase.from("struktur_organisasi").update(data).eq("id", id));
  } else {
    data.dibuat_oleh = akses.user?.id ?? null;
    ({ error } = await supabase.from("struktur_organisasi").insert(data));
  }

  if (error) {
    if (namaFileBaru) await supabase.storage.from("desa-media").remove([namaFileBaru]);
    return { error: "Gagal menyimpan data. Pastikan migrasi 0047 sudah dijalankan." };
  }

  // Foto diganti -> hapus file lama supaya tidak jadi sampah.
  if (namaFileBaru && lama?.foto_url) {
    const berkasLama = namaFileDariUrl(lama.foto_url);
    if (berkasLama) await supabase.storage.from("desa-media").remove([berkasLama]);
  }

  segarkan();
  return { success: true };
}

/** Tampilkan / sembunyikan dari publik. */
export async function ubahAktifStruktur(id, nilai) {
  if (!UUID.test(id || "")) return { error: "Data tidak valid." };
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.from("struktur_organisasi").update({ aktif: !!nilai }).eq("id", id);
  if (error) return { error: "Gagal mengubah status." };
  segarkan();
  return { success: true };
}

/** Geser satu langkah ke kiri ("naik") atau ke kanan ("turun") di antara saudaranya. */
export async function geserStruktur(id, arah) {
  if (!UUID.test(id || "") || !["naik", "turun"].includes(arah)) return { error: "Data tidak valid." };
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { data: item } = await supabase
    .from("struktur_organisasi")
    .select("id, atasan_id")
    .eq("id", id)
    .maybeSingle();
  if (!item) return { error: "Data tidak ditemukan." };

  let q = supabase.from("struktur_organisasi").select("id, urutan, created_at");
  q = item.atasan_id ? q.eq("atasan_id", item.atasan_id) : q.is("atasan_id", null);
  const { data: saudara } = await q;
  const urut = (saudara || []).sort(
    (a, b) => a.urutan - b.urutan || String(a.created_at).localeCompare(String(b.created_at))
  );

  const i = urut.findIndex((s) => s.id === id);
  const j = arah === "naik" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= urut.length) return { success: true };

  [urut[i], urut[j]] = [urut[j], urut[i]];
  // Tulis ulang nomor urut 0..n-1 supaya selalu rapi & tidak ada angka kembar.
  for (let k = 0; k < urut.length; k++) {
    const { error } = await supabase.from("struktur_organisasi").update({ urutan: k }).eq("id", urut[k].id);
    if (error) return { error: "Gagal mengubah urutan." };
  }
  segarkan();
  return { success: true };
}

export async function hapusStruktur(id) {
  if (!UUID.test(id || "")) return { error: "Data tidak valid." };
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { count } = await supabase
    .from("struktur_organisasi")
    .select("id", { count: "exact", head: true })
    .eq("atasan_id", id);
  if (count > 0) {
    return { error: "Jabatan ini masih punya bawahan. Pindahkan atau hapus bawahannya dulu." };
  }

  const { data: item } = await supabase.from("struktur_organisasi").select("foto_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("struktur_organisasi").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus. Coba lagi." };

  const berkas = namaFileDariUrl(item?.foto_url);
  if (berkas) await supabase.storage.from("desa-media").remove([berkas]);

  segarkan();
  return { success: true };
}
