// Latar bagian bawah beranda: gradasi putih -> abu hangat yang tenang.
// (Dulu berisi blob warna bergerak; dibuat polos supaya tampilan lebih rapi.)
export default function AuroraBackground({ children }) {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-white via-royal-pale to-stone-100">
      {children}
    </div>
  );
}
