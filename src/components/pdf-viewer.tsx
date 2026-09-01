"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  title?: string;
  className?: string;
};

/**
 * Client-side PDF rendering via `pdfjs-dist` — canvas-based, so it works uniformly on desktop and
 * mobile. An `<iframe src="file.pdf">` relies on the browser having a native PDF plugin wired into
 * iframes; desktop Chrome/Firefox/Edge do, but most mobile browsers (iOS Safari, Chrome/Android)
 * don't — the frame just renders blank, and the only way to actually see the document is a
 * separate "open in new tab"/download link. Rendering with pdf.js sidesteps that: it's pure
 * JS/canvas, so the same code path renders the same way on every device.
 */
export function PdfViewer({ url, title, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setStatus("loading");
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.replaceChildren();

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const containerWidth = container.clientWidth || 800;
          const scale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          if (pageNum < pdf.numPages) canvas.style.marginBottom = "8px";
          container.appendChild(canvas);

          await page.render({ canvas, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    render();
    return () => {
      cancelled = true;
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
      {status === "loading" && <p className="p-8 text-center text-[13px] text-[#a68f80]">Memuat dokumen...</p>}
      <div ref={containerRef} aria-label={title} className="mx-auto max-w-full" />
    </div>
  );
}
