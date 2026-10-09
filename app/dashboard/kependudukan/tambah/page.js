import { createClient } from "@/lib/supabase/server";
import { ambilPilihanDusun } from "@/lib/wilayah";
import FormTambahKeluarga from "./FormTambahKeluarga";

export default async function TambahWargaPage() {
  const supabase = await createClient();
  const { pilihan, terkunci } = await ambilPilihanDusun(supabase);
  return <FormTambahKeluarga pilihanDusun={pilihan} dusunTerkunci={terkunci} />;
}
