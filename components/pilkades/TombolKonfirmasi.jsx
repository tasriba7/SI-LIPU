"use client";

// Tombol submit yang bertanya dulu ("Yakin?") sebelum formulir dikirim.
export default function TombolKonfirmasi({ pesan, className, children }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(pesan)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
