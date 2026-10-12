"use client";

import { useState } from "react";

import { MaterialIcon } from "../../components/material-icon";

/**
 * "Unduh PDF" for the Laporan Pelaksanaan VIU: asks the server to print the report and downloads
 * the file directly (no print dialog). Falls back to the browser's print dialog if that fails.
 */
export function PdfDownloadButton({ scheme, periodKey }: { scheme: "konsumsi" | "industri"; periodKey: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47/pdf?scheme=${scheme}&periode=${encodeURIComponent(periodKey)}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "Laporan-Pelaksanaan-VIU.pdf";
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
      <MaterialIcon name={busy ? "hourglass_top" : "download"} className="text-[16px]" />
      {busy ? "Menyiapkan PDF…" : "Unduh PDF"}
    </button>
  );
}
