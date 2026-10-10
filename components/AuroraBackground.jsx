// Latar bergerak untuk bagian bawah beranda: gradasi lembut, blob warna
// (navy/biru laut/emas dari logo) melayang pelan, dan grid halus.
// Murni CSS (lihat .aurora-blob di styles/globals.css) jadi ringan.
export default function AuroraBackground({ children }) {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-white via-sky-50 to-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora-blob anim-saat-tampil left-[-8%] top-[4%] h-[26rem] w-[26rem] bg-seablue/40" />
        <div className="aurora-blob anim-saat-tampil right-[-6%] top-[30%] h-[30rem] w-[30rem] bg-navy/25 [animation-delay:-8s]" />
        <div className="aurora-blob anim-saat-tampil left-[25%] top-[62%] h-[24rem] w-[24rem] bg-gold/40 [animation-delay:-14s]" />
        <div className="aurora-blob anim-saat-tampil bottom-[-6%] right-[10%] h-[26rem] w-[26rem] bg-seablue/35 [animation-delay:-4s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(11,44,107,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(11,44,107,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      </div>
      {children}
    </div>
  );
}
