"use client";

import { useState } from "react";

/**
 * "Unduh PDF": the server prints the report (headless Chromium) and the file downloads directly —
 * no print dialog ("Cetak" is the one that opens it). Falls back to the print dialog if the server
 * cannot produce the PDF.
 */
export function PdfDownloadButton({ url }: { url: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "Laporan-Analisis-Teknis.pdf";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      if (window.confirm("PDF belum bisa dibuat otomatis. Buka dialog cetak untuk menyimpan sebagai PDF?")) window.print();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="rd-btn rd-btn-primary" onClick={download} disabled={busy} aria-busy={busy}>
      {busy ? "Menyiapkan PDF…" : "Unduh PDF"}
    </button>
  );
}
