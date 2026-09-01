"use client";

import { useEffect, useState } from "react";

import { PdfViewer } from "@/components/pdf-viewer";
import { MaterialIcon } from "@/modules/surveyor-workspace/components/material-icon";

type LocationCheck = {
  /** The location address as recorded in the system (application/company data) — read-only. */
  systemAddress: string;
  /** What the surveyor actually finds on-site — a real input, not a display value. */
  actualAddress: string;
  onActualAddressChange: (value: string) => void;
  status: "pending" | "approved" | "rejected";
  onApprove: () => void;
  onReject: () => void;
};

type Props = {
  documentPath: string;
  label: string;
  onClose: () => void;
  /** "Uraian yang Diperiksa" for on-site verification is a single question — does the location
   * address on file match what the surveyor finds on-site? Renders that comparison (system value +
   * an editable on-site answer) in the left panel instead of the plain document label. */
  locationCheck?: LocationCheck;
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
 * Fullscreen 3-panel document viewer — same overlay chrome and left/center/right structure as
 * verifikator-workspace's ReviewModal (document-verification-tab.tsx): dark backdrop, rounded
 * card, header with title/close, center dark canvas for the preview, side panels bordered. The
 * left panel shows the system-vs-actual location check when `locationCheck` is passed, or just
 * the document label when it's not.
 */
export function DocumentPreviewModal({ documentPath, label, onClose, locationCheck }: Props) {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-275 flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div className="text-[16px] font-extrabold text-[#20180f]">{label}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]"
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          {locationCheck ? (
            <div className="flex w-75 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-[#efe2d4] p-3.5">
              <div className="text-[13px] font-extrabold text-[#20180f]">Uraian yang Diperiksa</div>
              <div className="text-[11px] text-[#8a7565]">Kesesuaian alamat lokasi untuk {label}</div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a68f80]">Alamat pada Sistem</div>
                <div className="mt-1 rounded-md bg-[#f7f2ec] p-2.5 text-[12.5px] font-semibold text-[#20180f]">
                  {locationCheck.systemAddress || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a68f80]">
                  Alamat Aktual (Hasil Survey Lapangan)
                </div>
                <textarea
                  value={locationCheck.actualAddress}
                  onChange={(event) => locationCheck.onActualAddressChange(event.target.value)}
                  placeholder="Isikan alamat aktual berdasarkan hasil survey lapangan..."
                  rows={4}
                  className="mt-1 w-full resize-y rounded-md border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
                />
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-[#f5ebe1] pt-3">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#a68f80]">Hasil Pemeriksaan</div>
                <button
                  type="button"
                  onClick={locationCheck.onApprove}
                  className={
                    "flex items-center justify-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold " +
                    (locationCheck.status === "approved" ? "bg-[#16a34a] text-white" : "border border-[#cfe9d9] bg-white text-[#16a34a]")
                  }
                >
                  <MaterialIcon name="check_circle" className="text-[16px]" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={locationCheck.onReject}
                  className={
                    "flex items-center justify-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold " +
                    (locationCheck.status === "rejected" ? "bg-[#dc2626] text-white" : "border border-[#f3c2c2] bg-white text-[#dc2626]")
                  }
                >
                  <MaterialIcon name="cancel" className="text-[16px]" />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="w-55 shrink-0 overflow-y-auto rounded-lg border border-[#efe2d4] p-3.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8a7565]">Dokumen</div>
              <div className="mt-1 text-[13px] font-bold text-[#20180f]">{label}</div>
            </div>
          )}
          <div className="flex-1 overflow-auto rounded-lg bg-[#2c2f36] p-2">
            {isImagePath(documentPath) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={href} alt={label} className="mx-auto max-h-[68vh] w-auto" />
            ) : (
              <PdfViewer url={href} title={label} className="max-h-[68vh] overflow-y-auto" />
            )}
          </div>
          <div className="w-55 shrink-0 overflow-y-auto rounded-lg border border-[#efe2d4] p-3.5">
            <div className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-[#8a7565]">Informasi</div>
            <div className="flex flex-col gap-3 text-[12px]">
              <div>
                <div className="text-[#8a7565]">Format</div>
                <div className="mt-0.5 font-bold text-[#20180f]">{format || "—"}</div>
              </div>
              <div>
                <div className="text-[#8a7565]">Ukuran</div>
                <div className="mt-0.5 font-bold text-[#20180f]">{fileSize ?? "Memuat..."}</div>
              </div>
            </div>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[12px] font-semibold text-[#2f6fd6] underline decoration-dotted underline-offset-2"
            >
              Buka di tab baru
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
