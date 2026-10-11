import Reveal from "@/components/Reveal";
import { inisialNama } from "@/lib/strukturOrganisasi";

// Bagan struktur organisasi. Data berupa pohon dari lib/strukturOrganisasi.js
// (bangunPohon): [{ id, nama, jabatan, foto_url, anak: [...] }].
//   - Layar >= md : bagan pohon klasik (puncak di atas, bawahan di bawahnya,
//                   garis penghubung digambar CSS — lihat .bagan di globals.css).
//                   Kalau terlalu lebar, bisa digeser ke samping.
//   - Layar kecil : daftar bertingkat (lebih nyaman dibaca di HP).
// Server Component; hanya <Reveal> yang client (untuk animasi saat terlihat).

// Warna cincin foto & label jabatan per tingkat: puncak emas, tingkat 1 biru
// kobalt, tingkat berikutnya biru langit.
const GAYA = [
  {
    cincin: "from-gold via-gold-light to-gold",
    jabatan: "bg-gradient-to-r from-gold to-gold-light text-navy-dark shadow-sm shadow-gold/40",
    inisial: "from-navy to-navy-dark",
    foto: "h-28 w-28 sm:h-32 sm:w-32",
    lebar: "w-52",
  },
  {
    cincin: "from-royal via-navy-light to-royal-light",
    jabatan: "bg-navy/10 text-navy ring-1 ring-navy/20",
    inisial: "from-royal to-royal-light",
    foto: "h-20 w-20 sm:h-24 sm:w-24",
    lebar: "w-40 lg:w-44",
  },
  {
    cincin: "from-navy-light via-royal-light to-navy-light",
    jabatan: "bg-navy/10 text-navy-dark ring-1 ring-navy/30",
    inisial: "from-navy-light to-royal-light",
    foto: "h-16 w-16 sm:h-20 sm:w-20",
    lebar: "w-36 lg:w-40",
  },
];
const gaya = (tingkat) => GAYA[Math.min(tingkat, GAYA.length - 1)];

function Foto({ node, kelas, gradasiInisial }) {
  return node.foto_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={node.foto_url} alt={node.nama} loading="lazy" className={`${kelas} rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden
      className={`${kelas} flex items-center justify-center rounded-full bg-gradient-to-br font-display text-2xl font-bold text-white ${gradasiInisial}`}
    >
      {inisialNama(node.nama)}
    </span>
  );
}

// Kartu satu orang (desktop): foto bulat bercincin gradasi, nama di bawah foto,
// jabatan di bawah nama.
function Kartu({ node, tingkat, urutan }) {
  const g = gaya(tingkat);
  return (
    <Reveal variant="zoom" blur={false} delay={tingkat * 160 + urutan * 70} duration={700}>
      <div
        className={`kartu-terang group relative ${g.lebar} rounded-2xl px-3 pb-4 pt-5 text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-navy/25`}
      >
        <div
          className={`mx-auto w-fit rounded-full bg-gradient-to-br p-[3px] shadow-lg shadow-navy/20 transition-transform duration-500 group-hover:scale-105 ${g.cincin}`}
        >
          <div className="rounded-full bg-white p-1">
            <Foto node={node} kelas={g.foto} gradasiInisial={g.inisial} />
          </div>
        </div>
        <p className="mt-3 font-display text-[15px] font-bold leading-snug text-navy-dark">{node.nama}</p>
        <p
          className={`mx-auto mt-1.5 w-fit max-w-full rounded-full px-3 py-1 text-[11px] font-semibold leading-tight ${g.jabatan}`}
        >
          {node.jabatan}
        </p>
      </div>
    </Reveal>
  );
}

function Cabang({ daftar, tingkat }) {
  return (
    <ul>
      {daftar.map((node, i) => (
        <li key={node.id}>
          <Kartu node={node} tingkat={tingkat} urutan={i} />
          {node.anak.length > 0 && <Cabang daftar={node.anak} tingkat={tingkat + 1} />}
        </li>
      ))}
    </ul>
  );
}

// Versi HP: kartu mendatar (foto kiri, teks kanan), bawahan menjorok ke dalam.
function BarisHp({ daftar, tingkat }) {
  return (
    <ul className={tingkat === 0 ? "space-y-3" : "ml-6 mt-3 space-y-3 border-l-2 border-navy/25 pl-4"}>
      {daftar.map((node, i) => {
        const g = gaya(tingkat);
        return (
          <li key={node.id}>
            <Reveal blur={false} delay={Math.min(i, 5) * 60}>
              <div className="kartu-terang flex items-center gap-3.5 rounded-2xl p-3">
                <div className={`shrink-0 rounded-full bg-gradient-to-br p-[2.5px] ${g.cincin}`}>
                  <div className="rounded-full bg-white p-0.5">
                    <Foto node={node} kelas="h-16 w-16" gradasiInisial={g.inisial} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold leading-snug text-navy-dark">{node.nama}</p>
                  <p className={`mt-1 w-fit max-w-full rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${g.jabatan}`}>
                    {node.jabatan}
                  </p>
                </div>
              </div>
            </Reveal>
            {node.anak.length > 0 && <BarisHp daftar={node.anak} tingkat={tingkat + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

export default function BaganStruktur({ pohon }) {
  if (!pohon || pohon.length === 0) return null;
  return (
    <>
      {/* Desktop/tablet: bagan pohon, bisa digeser bila lebih lebar dari layar. */}
      <div className="hidden overflow-x-auto pb-6 pt-2 md:block [scrollbar-width:thin]">
        <div className="bagan mx-auto w-max">
          <Cabang daftar={pohon} tingkat={0} />
        </div>
      </div>

      {/* HP: daftar bertingkat. */}
      <div className="md:hidden">
        <BarisHp daftar={pohon} tingkat={0} />
      </div>
    </>
  );
}
