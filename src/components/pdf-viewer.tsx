"use client";

import { useEffect, useRef, useState } from "react";

import { loadPdfBytes, viewerUrl } from "@/lib/pdf-bytes-cache";

type Props = {
  url: string;
  title?: string;
  className?: string;
};

/** Retina looks sharper but doubles/triples canvas memory per page; cap the multiplier. */
const MAX_DEVICE_PIXEL_RATIO = 2;
/** Render pages this far outside the viewport ahead of time so scrolling stays smooth. */
const PRELOAD_MARGIN = "800px 0px";

/**
 * Client-side PDF rendering via `pdfjs-dist` — canvas-based, so it works uniformly on desktop and
 * mobile. An `<iframe src="file.pdf">` relies on the browser having a native PDF plugin wired into
 * iframes; desktop Chrome/Firefox/Edge do, but most mobile browsers (iOS Safari, Chrome/Android)
 * don't — the frame just renders blank, and the only way to actually see the document is a
 * separate "open in new tab"/download link. Rendering with pdf.js sidesteps that: it's pure
 * JS/canvas, so the same code path renders the same way on every device.
 *
 * Rendering is progressive: page 1 is rasterized and shown immediately, the rest are rasterized
 * lazily as they scroll near the viewport. A 40-page document no longer blocks the "ready" state
 * on rasterizing all 40 canvases up front.
 *
 * Bytes come from `loadPdfBytes` (one download with progress, cached for re-opens, prefetchable)
 * of the server's compressed viewing copy (`variant=preview`) — uploads are capped at 10 MB, so a
 * single request beats pdf.js's parallel stream + range requests competing on a slow link.
 */
export function PdfViewer({ url, title, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState<{ loaded: number; total: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    async function run() {
      setStatus("loading");
      setProgress(null);
      try {
        const bytesPromise = loadPdfBytes(viewerUrl(url), (loaded, total) => {
          if (!cancelled) setProgress({ loaded, total });
        });
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const data = await bytesPromise;
        if (cancelled) return;
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        cleanups.push(() => void loadingTask.destroy());

        const container = containerRef.current;
        if (!container) return;
        container.replaceChildren();

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
        const containerWidth = container.clientWidth || 800;

        const firstPage = await pdf.getPage(1);
        if (cancelled) return;
        const firstBaseViewport = firstPage.getViewport({ scale: 1 });
        const cssScale = containerWidth / firstBaseViewport.width;

        const rendered = new Set<number>();

        async function renderPage(pageNum: number, canvas: HTMLCanvasElement): Promise<boolean> {
          if (cancelled || rendered.has(pageNum)) return true;
          rendered.add(pageNum);
          try {
            const page = pageNum === 1 ? firstPage : await pdf.getPage(pageNum);
            if (cancelled) return false;
            const viewport = page.getViewport({ scale: cssScale * dpr });
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvas, viewport }).promise;
            return true;
          } catch {
            rendered.delete(pageNum);
            return false;
          }
        }

        const supportsObserver = typeof IntersectionObserver !== "undefined";
        const observer = supportsObserver
          ? new IntersectionObserver(
              (entries, obs) => {
                for (const entry of entries) {
                  if (!entry.isIntersecting) continue;
                  const canvas = entry.target as HTMLCanvasElement;
                  obs.unobserve(canvas);
                  void renderPage(Number(canvas.dataset.page), canvas);
                }
              },
              { root: null, rootMargin: PRELOAD_MARGIN },
            )
          : null;
        if (observer) cleanups.push(() => observer.disconnect());

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const canvas = document.createElement("canvas");
          canvas.dataset.page = String(pageNum);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.background = "#fff";
          // Reserve layout height before the page is rasterized so scroll offsets and the
          // IntersectionObserver work against the real document length from the start.
          canvas.style.aspectRatio = `${firstBaseViewport.width} / ${firstBaseViewport.height}`;
          if (pageNum < pdf.numPages) canvas.style.marginBottom = "8px";
          container.appendChild(canvas);

          if (pageNum === 1) {
            const ok = await renderPage(1, canvas);
            if (cancelled) return;
            if (!ok) {
              setStatus("error");
              return;
            }
            setStatus("ready");
          } else if (observer) {
            observer.observe(canvas);
          } else {
            void renderPage(pageNum, canvas);
          }
        }

        if (!cancelled && pdf.numPages === 0) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [url]);

  if (status === "error") {
    return (
      <div className={className}>
        <p className="p-8 text-center text-[13px] text-[#a68f80]">
          Dokumen tidak dapat ditampilkan di sini.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#2f6fd6] underline">
            Buka di tab baru
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {status === "loading" && (
        <div className="p-8 text-center text-[13px] text-[#a68f80]">
          <p>Memuat dokumen...</p>
          {progress && progress.loaded > 0 && (
            <div className="mx-auto mt-2.5 max-w-[260px]">
              {progress.total ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-[#f1e9df]">
                  <div
                    className="h-full rounded-full bg-[#e0662e] transition-[width]"
                    style={{ width: `${Math.min(100, Math.round((progress.loaded / progress.total) * 100))}%` }}
                  />
                </div>
              ) : null}
              <p className="mt-1 text-[11px]">
                {formatKb(progress.loaded)}
                {progress.total ? ` / ${formatKb(progress.total)}` : ""}
              </p>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} aria-label={title} className="mx-auto max-w-full" />
    </div>
  );
}

function formatKb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
