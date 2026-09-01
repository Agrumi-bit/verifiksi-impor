"use client";

import { useEffect, useState } from "react";

import { PdfViewer } from "@/components/pdf-viewer";

type Props = {
  documentPath: string;
  label: string;
};

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Inline (non-modal) 3-panel document preview — same left/center/right structure as
 * verifikator-workspace's ReviewModal (document-verification-tab.tsx), just embedded directly
 * under an expanded row instead of opening as an overlay. Used where a workspace only needs to
 * show the document (no decision/checklist to record here), so the left panel is a plain label
 * instead of a notes+decision form, and the right panel is basic file info instead of full
 * "Document Information" metadata (surveyor-workspace's document-check rows don't carry
 * version/uploader data).
 */
export function InlineDocumentPreview({ documentPath, label }: Props) {
  const href = fileHref(documentPath);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const format = (documentPath.split(".").pop() ?? "").toUpperCase();

  useEffect(() => {
    let cancelled = false;
    fetch(href, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        const length = res.headers.get("content-length");
        setFileSize(length ? formatFileSize(Number(length)) : null);
      })
      .catch(() => {
        if (!cancelled) setFileSize(null);
      });
    return () => {
      cancelled = true;
    };
  }, [href]);

  return (
    <div className="mt-3.5 flex flex-col overflow-hidden rounded-xl border border-[#dbe4f0] sm:flex-row">
      <div className="w-full shrink-0 border-b border-[#efe2d4] bg-[#f7f2ec] p-3.5 sm:w-[170px] sm:border-b-0 sm:border-r">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8a96a8]">Dokumen</div>
        <div className="mt-1 text-[13px] font-bold text-[#1c2530]">{label}</div>
      </div>
      <div className="min-h-[280px] flex-1 overflow-auto bg-[#2c2f36] p-2">
        {isImagePath(documentPath) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt={label} className="mx-auto max-h-[50vh] w-auto" />
        ) : (
          <PdfViewer url={href} title={label} className="max-h-[50vh] overflow-y-auto" />
        )}
      </div>
      <div className="w-full shrink-0 border-t border-[#efe2d4] p-3.5 sm:w-[190px] sm:border-t-0 sm:border-l">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8a96a8]">Informasi</div>
        <div className="mt-2 flex flex-col gap-2 text-[12px]">
          <div>
            <span className="text-[#8a96a8]">Format: </span>
            <span className="font-bold text-[#1c2530]">{format || "—"}</span>
          </div>
          <div>
            <span className="text-[#8a96a8]">Ukuran: </span>
            <span className="font-bold text-[#1c2530]">{fileSize ?? "Memuat..."}</span>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-[12px] font-semibold text-[#2f6fd6] underline decoration-dotted underline-offset-2"
        >
          Buka di tab baru
        </a>
      </div>
    </div>
  );
}
