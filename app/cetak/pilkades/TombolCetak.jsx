"use client";

export default function TombolCetak({ petunjuk }) {
  return (
    <div className="no-print" style={{ padding: "12px", background: "#f1f5f9", fontFamily: "sans-serif", fontSize: 13 }}>
      <button
        onClick={() => window.print()}
        style={{ padding: "8px 16px", background: "#0f2a4a", color: "#fff", borderRadius: 8, border: 0, cursor: "pointer" }}
      >
        Cetak
      </button>
      <span style={{ marginLeft: 12, color: "#475569" }}>
        {petunjuk ?? <>Di dialog cetak: pilih kertas <b>F4/Folio 330 x 215 mm</b> (atau kertas kustom), orientasi{" "}
        <b>Lanskap</b>, margin <b>Minimum/Tidak ada</b>, skala <b>100%</b>, aktifkan <b>Grafik latar belakang</b>.</>}
      </span>
    </div>
  );
}
