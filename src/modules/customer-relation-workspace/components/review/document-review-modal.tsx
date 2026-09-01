"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, History, MailQuestion, X, XCircle } from "lucide-react";

import { PdfViewer } from "@/components/pdf-viewer";
import { buildDisplayFileName } from "@/lib/document-filename";
import { checklistItemCode } from "@/modules/verifikator-workspace/schema";
import { docStatusLabel, InfoRow } from "@/modules/verifikator-workspace/components/detail/document-verification-tab";
import { CR_DOCUMENT_STATUS_LABELS, DOC_VERIFICATION_STATUS_BADGE, type CrDocumentCheckStatus, type DocVerificationStatusValue } from "../../status";

export type DocItem = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  lengkap: boolean;
  status: DocVerificationStatusValue;
  rejectionNote: string;
  requestNote: string;
  version: number;
  uploadedByName: string | null;
  uploadedAt: string | null;
  verifiedAt: string | null;
};

const CHECK_BUTTONS: { status: CrDocumentCheckStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: "VALID", label: "Dokumen Benar", icon: CheckCircle2 },
  { status: "REJECTED", label: "Dokumen Salah", icon: XCircle },
  { status: "NOT_APPLICABLE", label: "Dokumen Tidak Diperlukan", icon: HelpCircle },
];

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

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

type Props = {
  company: string;
  doc: DocItem;
  isSaving: boolean;
  onClose: () => void;
  onDecide: (status: CrDocumentCheckStatus, note: string) => void;
  onRequest: () => void;
  onShowHistory: () => void;
};

/**
 * Customer Relation's document review modal — same 3-pane layout as verifikator-workspace's
 * `ReviewModal` (document-verification-tab.tsx): decision panel on the left, document preview in
 * the middle, collapsible "Document Information" panel on the right. The one structural
 * difference is the left panel's content — CR only does an administrative benar/salah/tidak
 * diperlukan call (`CHECK_BUTTONS`), not verifikator's "Uraian yang Diperiksa" per-criterion
 * checklist.
 */
export function DocumentReviewModal({ company, doc, isSaving, onClose, onDecide, onRequest, onShowHistory }: Props) {
  const [note, setNote] = useState(doc.rejectionNote);
  const [collapsed, setCollapsed] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const href = doc.documentPath ? fileHref(doc.documentPath) : null;
  const docStatus = docStatusLabel(doc);
  const documentCode = checklistItemCode(doc.key, doc.label);
  const displayName = doc.documentPath ? buildDisplayFileName(documentCode, company, doc.version, doc.documentPath) : null;
  const format = doc.documentPath ? (doc.documentPath.split(".").pop() ?? "").toUpperCase() : null;
  const reviewLabel = doc.status === "PENDING" && !doc.lengkap ? "Belum Ada" : CR_DOCUMENT_STATUS_LABELS[doc.status];

  useEffect(() => {
    if (!href) return;
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
        className="flex max-h-[88vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">{doc.label}</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{doc.category}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex w-70 shrink-0 flex-col gap-3 overflow-y-auto">
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-[12.5px] font-bold text-[#20180f]">Pemeriksaan Dokumen</div>
                {!doc.lengkap && (
                  <button
                    type="button"
                    onClick={onRequest}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e8b89a] bg-[#fdeadd] px-2.5 py-1.5 text-[11px] font-bold text-[#c14a1f]"
                  >
                    <MailQuestion className="size-3.5" />
                    Minta Dokumen
                  </button>
                )}
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Catatan (opsional) — mis. alasan dokumen salah..."
                className="mb-3 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2.5 text-[12.5px] text-[#20180f] outline-none"
              />
              <div className="flex flex-col gap-2">
                {CHECK_BUTTONS.map(({ status, label, icon: Icon }) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onDecide(status, note)}
                    className={
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-bold disabled:opacity-50 " +
                      (doc.status === status
                        ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]"
                        : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                    }
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
              {doc.verifiedAt && (
                <div className="mt-3 text-[10.5px] text-[#8a7565]">Diperiksa: {new Date(doc.verifiedAt).toLocaleString("id-ID")}</div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-lg bg-[#2c2f36]">
            {!href && <p className="p-8 text-center text-[13px] text-[#a68f80]">Dokumen belum diunggah oleh perusahaan.</p>}
            {href && isImagePath(doc.documentPath!) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={href} alt={doc.label} className="mx-auto max-h-[68vh] w-auto" />
            )}
            {href && !isImagePath(doc.documentPath!) && <PdfViewer url={href} title={doc.label} className="max-h-[68vh] overflow-y-auto p-2" />}
          </div>
          <div className={`flex shrink-0 flex-col gap-3 overflow-y-auto transition-[width] duration-200 ${collapsed ? "w-13" : "w-70"}`}>
            <div
              className={`self-start overflow-hidden rounded-lg border border-[#efe2d4] transition-[width] duration-200 ${collapsed ? "w-13" : "w-full"}`}
            >
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                title={collapsed ? "Perluas panel" : "Ciutkan panel"}
                className="flex w-full items-center justify-between bg-[#eaf1fc] px-3.5 py-2.75"
              >
                {!collapsed && <span className="text-[12.5px] font-extrabold text-[#20180f]">Document Information</span>}
                {collapsed ? <ChevronLeft className="mx-auto size-4.5 text-[#4a5a70]" /> : <ChevronRight className="size-4.5 text-[#4a5a70]" />}
              </button>
              <div className={`flex flex-col gap-3 ${collapsed ? "px-1.5 py-3" : "p-3.5"}`}>
                <InfoRow icon="description" label="Document Name" collapsed={collapsed}>
                  {displayName ?? "—"}
                </InfoRow>
                <InfoRow icon="folder" label="Category" collapsed={collapsed}>
                  {doc.category}
                </InfoRow>
                <InfoRow icon="description" label="Format" collapsed={collapsed}>
                  {format ?? "—"}
                </InfoRow>
                <InfoRow icon="hard_drive" label="File Size" collapsed={collapsed}>
                  {href ? (fileSize ?? "Memuat...") : "—"}
                </InfoRow>
                <InfoRow icon="check_circle" label="Status Dokumen" collapsed={collapsed}>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: docStatus.bg, color: docStatus.color }}
                  >
                    {docStatus.label}
                  </span>
                </InfoRow>
                <InfoRow icon="fact_check" label="Status Pemeriksaan CR" collapsed={collapsed}>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[doc.status]}`}>
                    {reviewLabel}
                  </span>
                </InfoRow>
                {doc.lengkap && (
                  <div className={collapsed ? "" : "border-t border-[#f5ebe1] pt-3"}>
                    {collapsed ? (
                      <button type="button" onClick={onShowHistory} title="Version" className="flex w-full justify-center py-0.5">
                        <History className="size-4 text-[#8a7565]" />
                      </button>
                    ) : (
                      <InfoRow icon="history" label="Version">
                        <button
                          type="button"
                          onClick={onShowHistory}
                          className="flex items-center gap-1 text-[#2f6fd6] underline decoration-dotted underline-offset-2"
                        >
                          <History className="size-3.25" />v{doc.version}
                        </button>
                      </InfoRow>
                    )}
                  </div>
                )}
                <InfoRow icon="person" label="Uploaded By" collapsed={collapsed}>
                  {doc.uploadedByName ?? (doc.documentPath ? "Company" : "—")}
                </InfoRow>
                <InfoRow icon="calendar_month" label="Upload Date" collapsed={collapsed}>
                  {fmtDate(doc.uploadedAt)}
                </InfoRow>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
