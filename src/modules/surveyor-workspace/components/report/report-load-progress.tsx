"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating "Memuat laporan" indicator for the long printable reports: how many photos (JPEG/PNG/
 * WebP) and PDF pages/thumbnails have finished loading, the percentage, and how many KB/MB are still
 * to come. Watches every `<img>` served by /api/files on the page; sizes of photos come from a HEAD
 * request (Content-Length), sizes of PDF renders once they have loaded. Hidden in print.
 */
type Kind = "photo" | "pdf";
type Stat = { total: number; done: number; failed: number };
type Snapshot = { photo: Stat; pdf: Stat; loadedBytes: number; totalBytes: number; unknownSizes: number };

const EMPTY: Snapshot = { photo: { total: 0, done: 0, failed: 0 }, pdf: { total: 0, done: 0, failed: 0 }, loadedBytes: 0, totalBytes: 0, unknownSizes: 0 };

function kindOf(src: string): Kind | null {
  if (!src.includes("/api/files")) return null;
  return src.includes("/api/files/thumbnail") ? "pdf" : "photo";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  return `${Math.round(bytes / 1024).toLocaleString("id-ID")} KB`;
}

/** Reports can be stacked (LHVIU merged report): only the first mounted indicator renders. */
let activeOwner: symbol | null = null;

export function ReportLoadProgress() {
  const [owner] = useState(() => Symbol("report-load-progress"));
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeOwner === null) {
        activeOwner = owner;
        setIsOwner(true);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (activeOwner === owner) activeOwner = null;
    };
  }, [owner]);
  return isOwner ? <ReportLoadProgressPanel /> : null;
}

function ReportLoadProgressPanel() {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [hidden, setHidden] = useState(false);
  const sizes = useRef(new Map<string, number>());
  const headQueue = useRef<string[]>([]);
  const headQueued = useRef(new Set<string>());
  const headRunning = useRef(0);

  useEffect(() => {
    let alive = true;

    const pumpHead = () => {
      while (headRunning.current < 4 && headQueue.current.length > 0) {
        const src = headQueue.current.shift()!;
        headRunning.current++;
        fetch(src, { method: "HEAD" })
          .then((res) => {
            const len = Number(res.headers.get("content-length"));
            if (res.ok && len > 0) sizes.current.set(src, len);
          })
          .catch(() => undefined)
          .finally(() => {
            headRunning.current--;
            if (alive) pumpHead();
          });
      }
    };

    const scan = () => {
      const bySrc = new Map<string, { kind: Kind; done: boolean; failed: boolean }>();
      for (const img of Array.from(document.images)) {
        const src = img.currentSrc || img.src;
        const kind = kindOf(src);
        if (!kind) continue;
        const done = img.complete;
        const failed = done && img.naturalWidth === 0;
        const prev = bySrc.get(src);
        // The same photo can appear twice (e.g. a hidden measuring copy): done once any copy is.
        bySrc.set(src, { kind, done: Boolean(prev?.done) || done, failed: (prev?.failed ?? true) && failed });
      }

      const next: Snapshot = { photo: { total: 0, done: 0, failed: 0 }, pdf: { total: 0, done: 0, failed: 0 }, loadedBytes: 0, totalBytes: 0, unknownSizes: 0 };
      for (const [src, s] of bySrc) {
        const stat = next[s.kind];
        stat.total++;
        if (s.done) stat.done++;
        if (s.done && s.failed) stat.failed++;

        let size = sizes.current.get(src);
        if (size === undefined && s.done && !s.failed) {
          const entry = performance.getEntriesByName(src)[0] as PerformanceResourceTiming | undefined;
          const measured = entry ? entry.encodedBodySize || entry.transferSize : 0;
          if (measured > 0) {
            sizes.current.set(src, measured);
            size = measured;
          }
        }
        if (size === undefined && s.kind === "photo" && !headQueued.current.has(src)) {
          headQueued.current.add(src);
          headQueue.current.push(src);
        }
        if (size === undefined) {
          if (!s.done) next.unknownSizes++;
          continue;
        }
        next.totalBytes += size;
        if (s.done) next.loadedBytes += size;
      }
      pumpHead();
      if (alive) setSnap(next);
    };

    scan();
    const timer = setInterval(scan, 600);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const total = snap.photo.total + snap.pdf.total;
  const done = snap.photo.done + snap.pdf.done;
  const failed = snap.photo.failed + snap.pdf.failed;
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  const remaining = Math.max(0, snap.totalBytes - snap.loadedBytes);

  if (hidden) {
    return (
      <button type="button" className="report-load-progress" onClick={() => setHidden(false)} style={{ ...panelStyle, padding: "8px 12px", cursor: "pointer" }}>
        {complete ? "✓ Laporan dimuat 100%" : `Memuat ${pct}%`}
      </button>
    );
  }

  return (
    <div className="report-load-progress" role="status" aria-live="polite" style={panelStyle}>
      <style>{"@media print { .report-load-progress { display: none !important; } }"}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <strong style={{ fontSize: 12.5 }}>{complete ? "Laporan selesai dimuat" : "Memuat laporan…"}</strong>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: complete ? "#1a9850" : "#e0662e" }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#f0e6da", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: complete ? "#1a9850" : "#e0662e", transition: "width .4s ease" }} />
      </div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 11.5, color: "#4a4038" }}>
        <span>Foto (JPEG/PNG/WebP)</span>
        <span style={{ textAlign: "right" }}>
          {snap.photo.done}/{snap.photo.total}
        </span>
        {snap.pdf.total > 0 && (
          <>
            <span>Halaman / gambar PDF</span>
            <span style={{ textAlign: "right" }}>
              {snap.pdf.done}/{snap.pdf.total}
            </span>
          </>
        )}
        <span>Ukuran dimuat</span>
        <span style={{ textAlign: "right" }}>
          {formatBytes(snap.loadedBytes)} / {formatBytes(snap.totalBytes)}
        </span>
        {!complete && (
          <>
            <span>Sisa</span>
            <span style={{ textAlign: "right", fontWeight: 700 }}>
              {formatBytes(remaining)}
              {snap.unknownSizes > 0 ? ` + ${snap.unknownSizes} berkas` : ""}
            </span>
          </>
        )}
        {failed > 0 && (
          <>
            <span style={{ color: "#c1361f" }}>Gagal dimuat</span>
            <span style={{ textAlign: "right", color: "#c1361f" }}>{failed}</span>
          </>
        )}
      </div>
      {complete && <div style={{ marginTop: 6, fontSize: 11, color: "#1a9850" }}>Semua gambar & PDF sudah dimuat — siap dicetak / diunduh.</div>}
      <button type="button" onClick={() => setHidden(true)} style={{ marginTop: 8, fontSize: 11, color: "#8a7565", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
        Sembunyikan
      </button>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 90,
  width: 290,
  maxWidth: "calc(100vw - 32px)",
  background: "#fff",
  border: "1px solid #e8dccd",
  borderRadius: 12,
  boxShadow: "0 6px 24px rgb(0 0 0 / 0.14)",
  padding: "12px 14px",
  fontFamily: "var(--font-archivo), sans-serif",
  color: "#20180f",
};
