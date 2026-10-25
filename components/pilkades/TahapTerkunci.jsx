import IsiKunci from "./IsiKunci";

/** Gerbang di halaman: tampil bila tahap dibuka lewat alamat langsung padahal belum waktunya. */
export default function TahapTerkunci({ kunci }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <IsiKunci kunci={kunci} />
      </div>
    </div>
  );
}
