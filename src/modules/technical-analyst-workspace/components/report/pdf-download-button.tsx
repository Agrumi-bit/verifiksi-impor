"use client";

import { useState } from "react";

/**
 * "Unduh PDF": the server prints the report page (headless Chromium, with this user's session) as a
 * background job and the file downloads directly — no print dialog ("Cetak" is the one that opens
 * it). The button shows real progress: the server's percentage while the report loads its photos /
 * PDF pages and is printed, then the download itself. Falls back to the print dialog on failure.
 */
type JobState = { status: string; percent: number; detail: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POLL_MS = 1000;
const MAX_WAIT_MS = 6 * 60 * 1000; // the server gives up after 5 minutes of loading

export function PdfDownloadButton({ page, name }: { page: string | (() => string); name: string }) {
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);

  async function download() {
    setProgress({ percent: 0, label: "Memulai" });
    try {
      const start = await fetch("/api/report-pdf/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: typeof page === "function" ? page() : page, name }),
      });
      if (!start.ok) throw new Error(String(start.status));
      const { id } = ((await start.json()) as { data: { id: string } }).data;

      const deadline = Date.now() + MAX_WAIT_MS;
      for (;;) {
        if (Date.now() > deadline) throw new Error("timeout");
        await sleep(POLL_MS);
        const res = await fetch(`/api/report-pdf/jobs/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const job = ((await res.json()) as { data: JobState }).data;
        if (job.status === "error") throw new Error(job.detail);
        if (job.status === "done") break;
        // Server side (loading + printing) is shown as 0–95%; the download takes the rest.
        setProgress({ percent: Math.round(job.percent * 0.95), label: job.detail });
      }

      const file = await fetch(`/api/report-pdf/jobs/${id}/file`);
      if (!file.ok || !file.body) throw new Error(String(file.status));
      const total = Number(file.headers.get("content-length")) || 0;
      const reader = file.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setProgress({ percent: 95 + Math.round((received / total) * 5), label: "Mengunduh" });
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setProgress({ percent: 100, label: "Selesai" });
      await sleep(1500);
    } catch {
      if (window.confirm("PDF belum bisa dibuat otomatis. Buka dialog cetak untuk menyimpan sebagai PDF?")) window.print();
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <button
      type="button"
      className="rd-btn rd-btn-primary"
      onClick={download}
      disabled={busy}
      aria-busy={busy}
      title={busy ? progress.label : undefined}
      style={
        busy
          ? {
              minWidth: 190,
              background: `linear-gradient(90deg, rgba(255,255,255,0.28) ${progress.percent}%, transparent ${progress.percent}%), var(--rd-btn-primary-bg, #e0662e)`,
            }
          : undefined
      }
    >
      {busy ? `${progress.label} · ${progress.percent}%` : "Unduh PDF"}
    </button>
  );
}

/** "Unduh PDF" for the report page currently open. */
export function CurrentPagePdfButton({ name }: { name: string }) {
  return <PdfDownloadButton page={() => window.location.pathname + window.location.search} name={name} />;
}
