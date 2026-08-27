"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "./material-icon";
import { buildDisplayFileName } from "@/lib/document-filename";
import { documentFieldCode } from "@/modules/company/document-fields";

type VerificationStatusValue = "NOT_YET_VERIFIED" | "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" | "EXPIRED";

type DocumentEntry = {
  fieldKey: string;
  title: string;
  category: string;
  path: string | null;
  version: number;
  uploadedByName: string | null;
  uploadedAt: string;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
};

const STATUS_STYLE: Record<VerificationStatusValue, { label: string; bg: string; color: string }> = {
  NOT_YET_VERIFIED: { label: "Belum Diverifikasi", bg: "#f2ece5", color: "#8a7565" },
  VERIFIED: { label: "Terverifikasi", bg: "#e2f7ea", color: "#1a7a4c" },
  NEED_REVISION: { label: "Perlu Revisi", bg: "#fdedd6", color: "#b3650c" },
  REJECTED: { label: "Ditolak", bg: "#fbe4de", color: "#c1361f" },
  NOT_APPLICABLE: { label: "N/A", bg: "#ede9fe", color: "#6d28d9" },
  EXPIRED: { label: "Kadaluarsa", bg: "#faf1de", color: "#a6791f" },
};

function fileHref(path: string | null): string | null {
  return path ? `/api/files?path=${encodeURIComponent(path)}` : null;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({
  icon,
  label,
  collapsed,
  children,
}: {
  icon: string;
  label: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <div title={label} className="flex justify-center py-0.5">
        <MaterialIcon name={icon} className="text-[16px] text-[#8a7565]" />
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
        <MaterialIcon name={icon} className="text-[14px]" />
        {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-bold text-[#20180f]">{children}</div>
    </div>
  );
}

type VersionEntry = {
  version: number;
  path: string;
  uploadedByName: string | null;
  uploadedAt: string;
  isCurrent: boolean;
  verificationStatus: string;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
};

function VersionHistoryModal({
  companyId,
  fieldKey,
  docTitle,
  companyName,
  onClose,
  onSelectVersion,
  onUploaded,
}: {
  companyId: string;
  fieldKey: string;
  docTitle: string;
  companyName: string;
  onClose: () => void;
  onSelectVersion: (path: string, version: number) => void;
  onUploaded: () => void;
}) {
  const documentCode = documentFieldCode(fieldKey);
  const historyQueryKey = ["verifikator-workspace", "company-documents", companyId, fieldKey, "history"];
  const { data, isLoading, refetch } = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/company-documents/${companyId}/${encodeURIComponent(fieldKey)}/history`);
      if (!response.ok) throw new Error("Gagal memuat riwayat dokumen");
      const json = (await response.json()) as { data: VersionEntry[] };
      return json.data;
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const versions = data ?? [];

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "temporary");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Gagal mengunggah file");
      const { path } = (await uploadRes.json()) as { path: string };

      const saveRes = await fetch(`/api/verifikator-workspace/company-documents/${companyId}/${encodeURIComponent(fieldKey)}/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan dokumen baru");
      }
      toast.success("Dokumen baru berhasil diunggah.");
      await refetch();
      onUploaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen baru");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-5" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-[480px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5.5 pb-3 pt-5">
          <div>
            <div className="text-[18px] font-extrabold text-[#20180f]">Version History</div>
            <div className="mt-0.75 text-[12.5px] text-[#8a7565]">{docTitle}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="px-5.5 pb-3.5">
          <label
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] border-[1.5px] border-dashed border-[#b7cdf0] bg-[#eaf1fc] p-3.5 text-center ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <MaterialIcon name="upload_file" className="text-[20px] text-[#2f6fe0]" />
            <span className="text-[12.5px] font-bold text-[#2f6fe0]">{isUploading ? "Mengunggah..." : "Upload New Document"}</span>
            <span className="text-[11px] text-[#6b8bc4]">Klik untuk memilih file PDF/JPG/PNG</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={isUploading} onChange={handleUpload} />
          </label>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 pb-3">
          {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
          {!isLoading && versions.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada riwayat dokumen.</p>}
          {versions.map((v) => {
            const fileName = v.path ? buildDisplayFileName(documentCode, companyName, v.version, v.path) : "Tidak ada file (keputusan N/A)";
            const href = fileHref(v.path);
            const isSelected = selectedVersion === v.version;
            return (
              <div key={v.version} className="rounded-[10px] border border-[#efe2d4] p-4">
                <div className="flex items-start gap-3">
                  <div
                    onClick={() => setSelectedVersion(v.version)}
                    className="mt-0.5 flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2"
                    style={{ borderColor: isSelected ? "#e0662e" : "#d8cdbf" }}
                  >
                    {isSelected && <div className="size-2.5 rounded-full bg-[#e0662e]" />}
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2ece5]">
                    <MaterialIcon name="description" className="text-[18px] text-[#8a7565]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13.5px] font-extrabold text-[#20180f]">{fileName}</span>
                      <span className="rounded-full bg-[#4a4038] px-2 py-0.5 text-[10.5px] font-bold text-white">v{v.version}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${v.isCurrent ? "bg-[#e2f7ea] text-[#1a7a4c]" : "bg-[#f2ece5] text-[#8a7565]"}`}
                      >
                        {v.isCurrent ? "Saat Ini" : "Sebelumnya"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Upload Date</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{fmtDateTime(v.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Uploaded By</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{v.uploadedByName ?? "—"}</div>
                  </div>
                </div>
                {v.path && href && (
                  <div className="mt-3.5 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectVersion(v.path!, v.version);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="visibility" className="text-[14px]" />
                      View
                    </button>
                    <a
                      href={href}
                      download={fileName}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="download" className="text-[14px]" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#f0ded0] px-5.5 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e1bfb3] px-4 py-2 text-[12.5px] font-semibold text-[#261813]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function FilePreviewModal({
  doc,
  companyId,
  companyName,
  onClose,
  onUploaded,
}: {
  doc: DocumentEntry;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [previewPath, setPreviewPath] = useState(doc.path);
  const [previewVersion, setPreviewVersion] = useState(doc.version);
  const href = fileHref(previewPath);
  const format = previewPath ? (previewPath.split(".").pop() ?? "").toUpperCase() : null;
  const [collapsed, setCollapsed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const status = STATUS_STYLE[doc.verificationStatus];
  const documentCode = documentFieldCode(doc.fieldKey);
  const displayName = previewPath ? buildDisplayFileName(documentCode, companyName, previewVersion, previewPath) : null;

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
        className="flex max-h-[90vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div className="text-[16px] font-extrabold text-[#20180f]">{doc.title}</div>
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
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e8dccd]">
            <div className="flex items-center justify-between bg-[#22252b] px-4 py-2.5">
              <span className="truncate text-[12.5px] text-[#e8e6e3]">{displayName ?? "Belum diunggah"}</span>
              {href && (
                <a href={href} download={displayName ?? undefined} aria-label="Download" className="flex shrink-0 items-center gap-1.5 text-[#a68f80] hover:text-[#e8e6e3]">
                  <MaterialIcon name="download" className="text-[16px]" />
                </a>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-[#2c2f36]">
              {!href && (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                  <MaterialIcon name="upload_file" className="text-[32px] text-[#6b7280]" />
                  <p className="text-[13px] text-[#a68f80]">Perusahaan belum mengunggah dokumen ini.</p>
                  <button
                    type="button"
                    onClick={() => setShowVersionHistory(true)}
                    className="mt-1 rounded-lg bg-[#e0662e] px-3.5 py-2 text-[12px] font-bold text-white"
                  >
                    Upload Dokumen
                  </button>
                </div>
              )}
              {href && isImagePath(previewPath!) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={doc.title} className="mx-auto max-h-[70vh] w-auto" />
              )}
              {href && !isImagePath(previewPath!) && (
                <iframe src={href} title={doc.title} className="h-[70vh] w-full border-0" />
              )}
            </div>
          </div>
          <div
            className={`shrink-0 self-start overflow-y-auto rounded-lg border border-[#efe2d4] transition-[width] duration-200 ${collapsed ? "w-13" : "w-[230px]"}`}
          >
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Perluas panel" : "Ciutkan panel"}
              className="flex w-full items-center justify-between bg-[#eaf1fc] px-4 py-3.5"
            >
              {!collapsed && <span className="text-[13px] font-extrabold text-[#20180f]">Document Information</span>}
              {collapsed ? (
                <MaterialIcon name="chevron_right" className="mx-auto text-[18px] text-[#4a5a70]" />
              ) : (
                <MaterialIcon name="chevron_left" className="text-[18px] text-[#4a5a70]" />
              )}
            </button>
            <div className={`flex flex-col gap-3 ${collapsed ? "px-2 py-3" : "p-4"}`}>
              <InfoRow icon="description" label="Document Name" collapsed={collapsed}>
                {displayName ?? "Belum diunggah"}
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
              <InfoRow icon="check_circle" label="Status" collapsed={collapsed}>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </InfoRow>
              <div className={collapsed ? "" : "border-t border-[#f5ebe1] pt-3"}>
                {collapsed ? (
                  <button type="button" onClick={() => setShowVersionHistory(true)} title="Version" className="flex w-full justify-center py-0.5">
                    <MaterialIcon name="history" className="text-[16px] text-[#8a7565]" />
                  </button>
                ) : (
                  <InfoRow icon="history" label="Version">
                    <button
                      type="button"
                      onClick={() => setShowVersionHistory(true)}
                      className="text-[#2f6fd6] underline decoration-dotted underline-offset-2"
                    >
                      v{doc.version}
                    </button>
                  </InfoRow>
                )}
              </div>
              <InfoRow icon="person" label="Uploaded By" collapsed={collapsed}>
                {doc.uploadedByName ?? "—"}
              </InfoRow>
              <InfoRow icon="calendar_month" label="Upload Date" collapsed={collapsed}>
                {fmtDateTime(doc.uploadedAt)}
              </InfoRow>
            </div>
          </div>
        </div>
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          companyId={companyId}
          fieldKey={doc.fieldKey}
          docTitle={doc.title}
          companyName={companyName}
          onClose={() => setShowVersionHistory(false)}
          onSelectVersion={(path, version) => {
            setPreviewPath(path);
            setPreviewVersion(version);
          }}
          onUploaded={onUploaded}
        />
      )}
    </div>
  );
}

function RejectModal({ doc, onClose, onSubmit }: { doc: DocumentEntry; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-3.5 rounded-xl bg-white p-5.5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-[16px] font-extrabold text-[#20180f]">Tolak Dokumen</div>
        <div className="text-[12.5px] text-[#8a7565]">{doc.title} — jelaskan alasan penolakan (opsional).</div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="Contoh: Dokumen tidak terbaca / sudah kadaluarsa..."
          className="w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-3 text-[13px] text-[#20180f] outline-none"
        />
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e1bfb3] px-4 py-2 text-[12.5px] font-semibold text-[#261813]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note.trim())}
            className="rounded-lg bg-[#c1361f] px-4 py-2 text-[12.5px] font-bold text-white"
          >
            Tolak Dokumen
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  onView,
  onVerify,
  onReject,
  onMarkNotApplicable,
  isMutating,
}: {
  doc: DocumentEntry;
  onView: () => void;
  onVerify: () => void;
  onReject: () => void;
  onMarkNotApplicable: () => void;
  isMutating: boolean;
}) {
  const status = STATUS_STYLE[doc.verificationStatus];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#efe2d4] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14.5px] font-extrabold text-[#20180f]">{doc.title}</div>
          <div className="mt-0.5 text-[11.5px] text-[#a68f80]">{doc.category}{doc.path ? ` · v${doc.version}` : " · Belum diunggah"}</div>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: status.bg, color: status.color }}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-[12px]">
        <div>
          <div className="text-[10.5px] text-[#a68f80]">Diunggah Oleh</div>
          <div className="mt-0.5 font-bold text-[#20180f]">{doc.uploadedByName ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10.5px] text-[#a68f80]">Tanggal Unggah</div>
          <div className="mt-0.5 font-bold text-[#20180f]">{fmtDateTime(doc.uploadedAt)}</div>
        </div>
      </div>

      {(doc.verificationStatus === "VERIFIED" || doc.verificationStatus === "REJECTED" || doc.verificationStatus === "NOT_APPLICABLE") && (
        <div className="rounded-lg bg-[#faf7f4] p-3">
          <div className="text-[11px] text-[#a68f80]">
            {doc.verificationStatus === "VERIFIED" ? "Diverifikasi Oleh" : doc.verificationStatus === "REJECTED" ? "Ditolak Oleh" : "Ditandai N/A Oleh"}
          </div>
          <div className="mt-0.5 text-[12.5px] font-bold text-[#20180f]">
            {doc.verifiedByName ?? "—"} · {fmtDateTime(doc.verifiedAt)}
          </div>
          {doc.verificationStatus === "REJECTED" && doc.rejectionNote && (
            <div className="mt-1.5 text-[12px] text-[#c1361f]">{doc.rejectionNote}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-2 text-[12px] font-semibold text-[#261813]"
        >
          <MaterialIcon name={doc.path ? "visibility" : "upload_file"} className="text-[15px]" />
          {doc.path ? "Lihat Dokumen" : "Upload Dokumen"}
        </button>
        <button
          type="button"
          disabled={isMutating || !doc.path}
          onClick={onVerify}
          title={doc.path ? undefined : "Belum ada dokumen untuk diverifikasi"}
          className="flex items-center gap-1.5 rounded-lg bg-[#1a9850] px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-60"
        >
          <MaterialIcon name="check_circle" className="text-[15px]" />
          Verifikasi
        </button>
        <button
          type="button"
          disabled={isMutating}
          onClick={onReject}
          className="flex items-center gap-1.5 rounded-lg border border-[#e1a89a] px-3.5 py-2 text-[12px] font-bold text-[#c1361f] disabled:opacity-60"
        >
          <MaterialIcon name="cancel" className="text-[15px]" />
          Tolak
        </button>
        <button
          type="button"
          disabled={isMutating}
          onClick={onMarkNotApplicable}
          className="flex items-center gap-1.5 rounded-lg border border-[#d8cdfb] px-3.5 py-2 text-[12px] font-bold text-[#6d28d9] disabled:opacity-60"
        >
          <MaterialIcon name="block" className="text-[15px]" />
          N/A
        </button>
      </div>
    </div>
  );
}

export function DocumentVerificationDetail({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["verifikator-workspace", "company-documents", companyId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/company-documents/${companyId}`);
      if (!response.ok) throw new Error("Gagal memuat dokumen perusahaan");
      return (await response.json()) as { data: DocumentEntry[]; companyName: string };
    },
  });

  const [viewingDoc, setViewingDoc] = useState<DocumentEntry | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<DocumentEntry | null>(null);
  const [mutatingFieldKey, setMutatingFieldKey] = useState<string | null>(null);

  const entries = data?.data ?? [];
  const grouped = useMemo(() => {
    const byCategory = new Map<string, DocumentEntry[]>();
    for (const entry of data?.data ?? []) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }
    return Array.from(byCategory.entries());
  }, [data]);

  async function submitDecision(fieldKey: string, status: "VERIFIED" | "REJECTED" | "NOT_APPLICABLE", rejectionNote?: string) {
    setMutatingFieldKey(fieldKey);
    try {
      const response = await fetch(`/api/verifikator-workspace/company-documents/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, status, rejectionNote }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan keputusan verifikasi");
      }
      toast.success(
        status === "VERIFIED" ? "Dokumen berhasil diverifikasi." : status === "REJECTED" ? "Dokumen ditolak." : "Dokumen ditandai N/A.",
      );
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan keputusan verifikasi");
    } finally {
      setMutatingFieldKey(null);
    }
  }

  return (
    <div className="p-7">
      <Link
        href="/verifikator-workspace/document-verification"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a7565]"
      >
        <MaterialIcon name="arrow_back" className="text-[15px]" />
        Kembali
      </Link>

      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">{data?.companyName ?? "Memuat..."}</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Tinjau dan verifikasi setiap dokumen legalitas dan pajak perusahaan ini.</div>
      </div>

      {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
      {isError && <p className="p-6 text-center text-[#c1361f]">Gagal memuat dokumen perusahaan.</p>}
      {!isLoading && !isError && entries.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[#a68f80]">
          Belum ada dokumen yang diunggah perusahaan ini.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {grouped.map(([category, docs]) => (
          <div key={category}>
            <div className="mb-3 text-[13px] font-bold text-[#594138]">{category}</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.fieldKey}
                  doc={doc}
                  isMutating={mutatingFieldKey === doc.fieldKey}
                  onView={() => setViewingDoc(doc)}
                  onVerify={() => submitDecision(doc.fieldKey, "VERIFIED")}
                  onReject={() => setRejectingDoc(doc)}
                  onMarkNotApplicable={() => submitDecision(doc.fieldKey, "NOT_APPLICABLE")}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewingDoc && (
        <FilePreviewModal
          doc={viewingDoc}
          companyId={companyId}
          companyName={data?.companyName ?? ""}
          onClose={() => setViewingDoc(null)}
          onUploaded={() => queryClient.invalidateQueries({ queryKey })}
        />
      )}
      {rejectingDoc && (
        <RejectModal
          doc={rejectingDoc}
          onClose={() => setRejectingDoc(null)}
          onSubmit={(note) => {
            submitDecision(rejectingDoc.fieldKey, "REJECTED", note || undefined);
            setRejectingDoc(null);
          }}
        />
      )}
    </div>
  );
}
