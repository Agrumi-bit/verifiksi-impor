"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Badge,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Download,
  Eye,
  Factory,
  FileText,
  Folder,
  HardDrive,
  History,
  Info,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  User,
  UserCircle2,
  Warehouse,
  X,
} from "lucide-react";

import { avatarColor, fmtDate, initials, STATUS_LABEL, STATUS_STYLE } from "@/modules/company/utils";
import { TAX_PROOF_TYPE_LABELS } from "@/modules/company/schema";
import { documentFieldCode } from "@/modules/company/document-fields";
import { OWNERSHIP_DOCUMENT_TYPE_LABELS, LEASE_DOCUMENT_TYPE_LABELS, splitKbliEntries } from "@/modules/shared/schema";
import { buildDisplayFileName } from "@/lib/document-filename";
import type { CompanyProfileData } from "./profile-tabs";

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };
const BUILDING_STATUS_LABEL: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };
const LOCATION_TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  PABRIK: Factory,
  GUDANG: Warehouse,
  KANTOR: Building2,
};

const HIGHLIGHT = { borderColor: "#e0662e", bg: "#fdeadd", color: "#c14a1f" };
const NEUTRAL = { borderColor: "#e8dccd", bg: "#fff", color: "#20180f" };

type VerificationStatusValue = "NOT_YET_VERIFIED" | "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" | "EXPIRED";
type VerifiedByRole = "CR" | "VERIFIKATOR";

const VERIFICATION_STATUS_STYLE: Record<VerificationStatusValue, { label: string; bg: string; color: string }> = {
  NOT_YET_VERIFIED: { label: "Belum Diverifikasi", bg: "#f2ece5", color: "#8a7565" },
  VERIFIED: { label: "Terverifikasi", bg: "#e2f7ea", color: "#1a7a4c" },
  NEED_REVISION: { label: "Perlu Revisi", bg: "#fdedd6", color: "#b3650c" },
  REJECTED: { label: "Ditolak", bg: "#fbe4de", color: "#c1361f" },
  NOT_APPLICABLE: { label: "N/A", bg: "#ede9fe", color: "#6d28d9" },
  EXPIRED: { label: "Kadaluarsa", bg: "#faf1de", color: "#a6791f" },
};

/**
 * A document Customer Relation marked VALID is only an administrative check — the verifikator
 * hasn't reviewed it yet, so it must not read as "Terverifikasi" (which implies the authoritative
 * verifikator decision). Every other status is shared and unambiguous either way.
 */
function verificationStatusDisplay(
  status: VerificationStatusValue,
  verifiedByRole: VerifiedByRole | null | undefined,
): { label: string; bg: string; color: string } {
  if (status === "VERIFIED" && verifiedByRole === "CR") {
    return { label: "Valid (CR) — Menunggu Verifikator", bg: "#fdf0d5", color: "#a3690a" };
  }
  return VERIFICATION_STATUS_STYLE[status];
}

function fileHref(path: string | null | undefined): string | null {
  return path ? `/api/files?path=${encodeURIComponent(path)}` : null;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

/**
 * The stored path (`temporary/<uuid>-<original filename>.pdf`) is
 * disambiguation for storage, not something a user should ever read —
 * "Document Name" shows a structured label instead: <TYPE>_<COMPANY>_V<n>.
 * See `document-filename.ts` — same rule applied everywhere.
 */
function fieldDisplayFileName(fieldKey: string, companyName: string, version: number, path: string): string {
  return buildDisplayFileName(documentFieldCode(fieldKey), companyName, version, path);
}

type ViewingDoc = {
  title: string;
  path: string;
  fieldKey: string;
  category: string;
  version: number;
  uploadedByName: string | null;
  uploadedAt: string;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
};

function documentMetaFor(data: CompanyProfileData, fieldKey: string) {
  return (
    data.documentMeta[fieldKey] ?? {
      version: 1,
      uploadedByName: null,
      uploadedAt: data.updatedAt,
      verificationStatus: "NOT_YET_VERIFIED" as VerificationStatusValue,
      verifiedByName: null,
      verifiedAt: null,
      verifiedByRole: null as VerifiedByRole | null,
      rejectionNote: null,
    }
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-bold text-[#20180f]">{children}</div>
    </div>
  );
}

type DocumentVersionEntry = {
  version: number;
  path: string;
  uploadedByName: string | null;
  uploadedAt: string;
  isCurrent: boolean;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
};

function VersionHistoryModal({
  fieldKey,
  docTitle,
  companyName,
  onClose,
  onSelectVersion,
}: {
  fieldKey: string;
  docTitle: string;
  companyName: string;
  onClose: () => void;
  onSelectVersion: (entry: DocumentVersionEntry, title: string) => void;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["company-workspace", "profile", "document-history", fieldKey];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/company-workspace/profile/document-history?fieldKey=${encodeURIComponent(fieldKey)}`);
      if (!response.ok) throw new Error("Gagal memuat riwayat dokumen");
      const json = (await response.json()) as { data: DocumentVersionEntry[] };
      return json.data;
    },
  });

  const [isUploading, setIsUploading] = useState(false);

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

      const saveRes = await fetch("/api/company-workspace/profile/document-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, path }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan dokumen baru");
      }
      toast.success("Dokumen baru berhasil diunggah.");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "profile"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen baru");
    } finally {
      setIsUploading(false);
    }
  }

  const versions = data ?? [];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-5" onClick={onClose}>
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
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5.5 pb-3.5">
          <label
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] border-[1.5px] border-dashed border-[#b7cdf0] bg-[#eaf1fc] p-3.5 text-center ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <UploadCloud className="size-5 text-[#2f6fe0]" />
            <span className="text-[12.5px] font-bold text-[#2f6fe0]">{isUploading ? "Mengunggah..." : "Upload New Document"}</span>
            <span className="text-[11px] text-[#6b8bc4]">Klik untuk memilih file PDF/JPG/PNG</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={isUploading} onChange={handleUpload} />
          </label>
        </div>
        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 pb-3">
          {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
          {!isLoading && versions.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada riwayat dokumen.</p>}
          {versions.map((v) => {
            const fileName = fieldDisplayFileName(fieldKey, companyName, v.version, v.path);
            const href = fileHref(v.path)!;
            return (
              <div key={v.version} className="rounded-[10px] border border-[#efe2d4] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2ece5]">
                    <FileText className="size-4.5 text-[#8a7565]" />
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
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ background: verificationStatusDisplay(v.verificationStatus, v.verifiedByRole).bg, color: verificationStatusDisplay(v.verificationStatus, v.verifiedByRole).color }}
                      >
                        {verificationStatusDisplay(v.verificationStatus, v.verifiedByRole).label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Upload Date</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{fmtDate(v.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Uploaded By</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{v.uploadedByName ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(v, docTitle);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
                  >
                    <Eye className="size-3.5" />
                    View
                  </button>
                  <a
                    href={href}
                    download={fileName}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-[#f0ded0] px-5.5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e1bfb3] px-4 py-2 text-[12.5px] font-semibold text-[#261813]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentViewerModal({
  doc,
  companyName,
  onClose,
  onSelectVersion,
  allowVersionHistory = true,
}: {
  doc: ViewingDoc;
  companyName: string;
  onClose: () => void;
  onSelectVersion: (entry: DocumentVersionEntry, title: string) => void;
  /** Version history reads/writes go through `/api/company-workspace/profile/document-history`,
   * scoped to the caller's own `session.user.companyId` — meaningless (and a 404) for a viewer
   * looking at a company that isn't their own, e.g. admin's read-only Company Detail page. */
  allowVersionHistory?: boolean;
}) {
  const href = fileHref(doc.path)!;
  const fileName = fieldDisplayFileName(doc.fieldKey, companyName, doc.version, doc.path);
  const format = (doc.path.split(".").pop() ?? "").toUpperCase();
  const [showInfo, setShowInfo] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);

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
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6"
      onClick={onClose}
    >
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
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e8dccd]">
            <div className="flex items-center justify-between bg-[#22252b] px-4 py-2.5">
              <span className="truncate text-[12.5px] text-[#e8e6e3]">{fileName}</span>
              <a
                href={href}
                download={fileName}
                aria-label="Download"
                className="flex shrink-0 items-center gap-1.5 text-[#a68f80] hover:text-[#e8e6e3]"
              >
                <Download className="size-4" />
              </a>
            </div>
            <div className="flex-1 overflow-auto bg-[#2c2f36]">
              {isImagePath(doc.path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={doc.title} className="mx-auto max-h-[70vh] w-auto" />
              ) : (
                <iframe src={href} title={doc.title} className="h-[70vh] w-full border-0" />
              )}
            </div>
          </div>
          <div className="w-[230px] shrink-0 self-start overflow-y-auto rounded-lg border border-[#efe2d4]">
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="flex w-full items-center justify-between bg-[#eaf1fc] px-4 py-3.5"
            >
              <span className="text-[13px] font-extrabold text-[#20180f]">Document Information</span>
              {showInfo ? <ChevronUp className="size-4.5 text-[#4a5a70]" /> : <ChevronDown className="size-4.5 text-[#4a5a70]" />}
            </button>
            {showInfo && (
              <div className="flex flex-col gap-3 p-4">
                <InfoRow icon={FileText} label="Document Name">
                  {fileName}
                </InfoRow>
                <InfoRow icon={Info} label="Document Type">
                  {doc.title}
                </InfoRow>
                <InfoRow icon={Folder} label="Category">
                  {doc.category}
                </InfoRow>
                <InfoRow icon={FileText} label="Format">
                  {format}
                </InfoRow>
                <InfoRow icon={HardDrive} label="File Size">
                  {fileSize ?? "Memuat..."}
                </InfoRow>
                <InfoRow icon={CheckCircle2} label="Status">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: verificationStatusDisplay(doc.verificationStatus, doc.verifiedByRole).color,
                      color: "#fff",
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {verificationStatusDisplay(doc.verificationStatus, doc.verifiedByRole).label}
                  </span>
                  {doc.verificationStatus === "REJECTED" && doc.rejectionNote && (
                    <div className="mt-1.5 text-[11.5px] font-normal text-[#c1361f]">{doc.rejectionNote}</div>
                  )}
                  {(doc.verificationStatus === "VERIFIED" || doc.verificationStatus === "REJECTED") && doc.verifiedByName && (
                    <div className="mt-1 text-[11px] font-normal text-[#8a7565]">
                      {doc.verifiedByName} · {fmtDate(doc.verifiedAt ?? doc.uploadedAt)}
                    </div>
                  )}
                </InfoRow>
                <div className="border-t border-[#f5ebe1] pt-3">
                  <InfoRow icon={History} label="Version">
                    {allowVersionHistory ? (
                      <button
                        type="button"
                        onClick={() => setShowVersionHistory(true)}
                        className="text-[#2f6fd6] underline decoration-dotted underline-offset-2"
                      >
                        v{doc.version}
                      </button>
                    ) : (
                      `v${doc.version}`
                    )}
                  </InfoRow>
                </div>
                <InfoRow icon={User} label="Uploaded By">
                  {doc.uploadedByName ?? "—"}
                </InfoRow>
                <InfoRow icon={Calendar} label="Upload Date">
                  {fmtDate(doc.uploadedAt)}
                </InfoRow>
              </div>
            )}
          </div>
        </div>
      </div>
      {allowVersionHistory && showVersionHistory && (
        <VersionHistoryModal
          fieldKey={doc.fieldKey}
          docTitle={doc.title}
          companyName={companyName}
          onClose={() => setShowVersionHistory(false)}
          onSelectVersion={onSelectVersion}
        />
      )}
    </div>
  );
}

function InfoBarStat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 border-r border-[#f3e9dd] p-4 last:border-r-0">
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-[#fdeadd]">
        <Icon className="size-[17px] text-[#e0662e]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10.5px] text-[#9c8a79]">{label}</div>
        <div className="mt-0.5 truncate text-[13px] font-bold text-[#20180f]">{value}</div>
      </div>
    </div>
  );
}

function OptionCard({ label, desc, selected }: { label: string; desc?: string; selected: boolean }) {
  const tone = selected ? HIGHLIGHT : NEUTRAL;
  return (
    <div
      className="relative rounded-[9px] border-[1.5px] p-4"
      style={{ borderColor: tone.borderColor, background: tone.bg }}
    >
      <div className="text-[13px] font-bold" style={{ color: tone.color }}>
        {label}
      </div>
      {desc && <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{desc}</div>}
      {selected && <CheckCircle2 className="absolute right-3.5 top-3.5 size-[18px] text-[#e0662e]" />}
    </div>
  );
}

function AddressField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">{label}</div>
      <div className="rounded-lg bg-[#f2ece5] px-3.5 py-2.75 text-[13px] text-[#594138]">{value || "—"}</div>
    </div>
  );
}

type DocField = { label: string; value: string };

/** Multiple KBLI codes side by side on one line is unreadable — one row per entry instead. */
function KbliEntryList({ entries }: { entries: { code: string; description: string }[] }) {
  if (entries.length === 0) {
    return <div className="text-[13px] text-[#9c8a79]">—</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <div key={`${entry.code}-${index}`} className="rounded-lg bg-[#faf7f4] px-3 py-2">
          <div className="text-[13px] font-bold text-[#20180f]">{entry.code || "—"}</div>
          <div className="mt-0.5 text-[12px] text-[#594138]">{entry.description || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function DocCard({
  title,
  fields,
  extra,
  path,
  fieldKey,
  verificationStatus,
  verifiedByRole,
  onView,
}: {
  title: string;
  fields: DocField[];
  /** Rendered below `fields` — for content that doesn't fit the flat 2-column grid, e.g. a stacked list of multiple KBLI entries. */
  extra?: ReactNode;
  path: string | null | undefined;
  fieldKey: string;
  verificationStatus: VerificationStatusValue;
  verifiedByRole: VerifiedByRole | null;
  onView: (doc: { title: string; path: string; fieldKey: string }) => void;
}) {
  const href = fileHref(path);
  const statusStyle = verificationStatusDisplay(verificationStatus, verifiedByRole);
  return (
    <div className="flex items-start gap-4.5 rounded-xl border border-[#efe2d4] bg-white p-5">
      <div className="flex h-[100px] w-20 shrink-0 flex-col gap-1.25 rounded-lg border border-[#e8d5c5] bg-[#faf1e8] p-2.5">
        <div className="h-[3px] w-[70%] rounded-sm bg-[#e0662e]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] w-[80%] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] w-[60%] rounded-sm bg-[#e8d5c5]" />
      </div>
      <div className="flex-1">
        <div className="text-[14.5px] font-extrabold text-[#20180f]">{title}</div>
        {fields.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3.5">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-[11px] text-[#9c8a79]">{f.label}</div>
                <div className="mt-0.5 text-[13px] font-bold text-[#20180f]">{f.value || "—"}</div>
              </div>
            ))}
          </div>
        )}
        {extra && <div className="mt-3">{extra}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2.5">
        <span
          className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold"
          style={href ? { background: statusStyle.bg, color: statusStyle.color } : { background: "#f2ece5", color: "#8a7565" }}
        >
          {href ? statusStyle.label : "Belum Diunggah"}
        </span>
        {href && path && (
          <button
            type="button"
            onClick={() => onView({ title, path, fieldKey })}
            className="rounded-lg bg-[#e0662e] px-4.5 py-2.25 text-[12.5px] font-bold text-white"
          >
            View
          </button>
        )}
      </div>
    </div>
  );
}

const PROFILE_TABS = [
  { key: "general", label: "Informasi Umum" },
  { key: "contact", label: "Contact" },
  { key: "legal", label: "Dokumen Legal" },
  { key: "tax", label: "Dokumen Pajak" },
  { key: "facilities", label: "Fasilitas" },
] as const;

type ProfileTabKey = (typeof PROFILE_TABS)[number]["key"];

function GeneralTab({ data }: { data: CompanyProfileData }) {
  return (
    <div className="rounded-xl border border-[#efe2d4] bg-white p-7">
      <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Jenis API</div>
      <div className="mb-5.5 grid grid-cols-2 gap-3">
        {(["API-P", "API-U"] as const).map((code) => (
          <OptionCard
            key={code}
            label={code}
            desc={code === "API-P" ? "Angka Pengenal Impor Produsen" : "Angka Pengenal Impor Umum"}
            selected={data.apiType === code}
          />
        ))}
      </div>

      <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Tipe Perusahaan</div>
      <div className="mb-5.5 grid grid-cols-3 gap-3">
        {["PT", "CV", "Firma", "Koperasi", "Perusahaan Perorangan"].map((label) => (
          <div key={label} className="text-center">
            <OptionCard label={label} selected={data.companyType === label} />
          </div>
        ))}
      </div>

      <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Status Investasi</div>
      <div className="mb-6.5 grid grid-cols-2 gap-3">
        {(["PMDN", "PMA"] as const).map((code) => (
          <OptionCard
            key={code}
            label={code}
            desc={code === "PMDN" ? "Penanaman Modal Dalam Negeri" : "Penanaman Modal Asing"}
            selected={data.investmentStatus === code}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <AddressField label="Jalan" value={data.addressJalan ?? ""} />
        <div className="grid grid-cols-2 gap-5">
          <AddressField label="Desa / Kelurahan" value={data.addressDesa ?? ""} />
          <AddressField label="Kecamatan" value={data.addressKecamatan ?? ""} />
          <AddressField label="Kota / Kabupaten" value={data.addressKota ?? ""} />
          <AddressField label="Provinsi" value={data.addressProvinsi ?? ""} />
          <AddressField label="Kode Pos" value={data.addressKodePos ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <AddressField label="Nomor Perusahaan (Telepon)" value={data.companyPhone} />
          <AddressField label="Email Perusahaan" value={data.companyEmail} />
        </div>
        <AddressField label="Website" value={data.companyWebsite ?? ""} />
      </div>
    </div>
  );
}

function ContactTab({ data }: { data: CompanyProfileData }) {
  return (
    <div className="max-w-[420px] rounded-xl border border-[#efe2d4] bg-white p-6">
      <div className="mb-4.5 flex items-center gap-2.5">
        <UserCircle2 className="size-5 text-[#e0662e]" />
        <div className="text-[14.5px] font-bold text-[#20180f]">Primary Contacts</div>
      </div>
      <div className="flex flex-col gap-3.5">
        {data.contacts.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada contact person.</p>}
        {data.contacts.map((c, index) => (
          <div key={index} className="rounded-[10px] border border-[#efe2d4] p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: avatarColor(c.name || "?") }}
              >
                {initials(c.name || "?")}
              </div>
              <div>
                <div className="text-[14px] font-bold text-[#2f6fd6]">{c.name}</div>
                <div className="mt-0.5 text-[12.5px] text-[#7a8bb0]">{c.jabatan}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`mailto:${c.email}`}
                className="flex size-8 items-center justify-center rounded-lg border border-[#e8dccd] text-[#8a7565]"
                aria-label={`Email ${c.name}`}
              >
                <Mail className="size-4" />
              </a>
              <a
                href={`tel:${c.whatsapp}`}
                className="flex size-8 items-center justify-center rounded-lg border border-[#e8dccd] text-[#8a7565]"
                aria-label={`Telepon ${c.name}`}
              >
                <Phone className="size-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegalTab({ data, onView }: { data: CompanyProfileData; onView: (doc: ViewingDoc) => void }) {
  const handleView = (doc: { title: string; path: string; fieldKey: string }) => {
    onView({ ...doc, category: "Legalitas Perusahaan", ...documentMetaFor(data, doc.fieldKey) });
  };
  const { utama: kbliUtama, pendukung: kbliPendukung } = splitKbliEntries(data.kbliEntries);
  return (
    <div className="flex flex-col gap-3.5">
      <DocCard
        title="NIB (Nomor Induk Berusaha)"
        path={data.nibDocumentPath}
        fieldKey="nibDocumentPath"
        onView={handleView}
        verificationStatus={documentMetaFor(data, "nibDocumentPath").verificationStatus}
        verifiedByRole={documentMetaFor(data, "nibDocumentPath").verifiedByRole}
        fields={[
          { label: "Nomor NIB", value: data.nibNumber },
          { label: "Tanggal Diterbitkan", value: data.nibIssueDate ? fmtDate(data.nibIssueDate) : "" },
        ]}
      />
      <DocCard
        title="KBLI Utama"
        path={data.kbliDocumentPath}
        fieldKey="kbliDocumentPath"
        onView={handleView}
        verificationStatus={documentMetaFor(data, "kbliDocumentPath").verificationStatus}
        verifiedByRole={documentMetaFor(data, "kbliDocumentPath").verifiedByRole}
        fields={[]}
        extra={<KbliEntryList entries={kbliUtama} />}
      />
      <DocCard
        title="KBLI Pendukung"
        path={data.kbliDocumentPath}
        fieldKey="kbliDocumentPath"
        onView={handleView}
        verificationStatus={documentMetaFor(data, "kbliDocumentPath").verificationStatus}
        verifiedByRole={documentMetaFor(data, "kbliDocumentPath").verifiedByRole}
        fields={[]}
        extra={<KbliEntryList entries={kbliPendukung} />}
      />
      {data.skNumber && (
        <DocCard
          title="SK Kemenkumham"
          path={data.skDocumentPath}
          fieldKey="skDocumentPath"
          onView={handleView}
          verificationStatus={documentMetaFor(data, "skDocumentPath").verificationStatus}
          verifiedByRole={documentMetaFor(data, "skDocumentPath").verifiedByRole}
          fields={[
            { label: "Nomor SK", value: data.skNumber },
            { label: "Tanggal Terbit", value: data.skDate ? fmtDate(data.skDate) : "" },
          ]}
        />
      )}
      <DocCard
        title="Akta Pendirian"
        path={data.notarialDocumentPath}
        fieldKey="notarialDocumentPath"
        onView={handleView}
        verificationStatus={documentMetaFor(data, "notarialDocumentPath").verificationStatus}
        verifiedByRole={documentMetaFor(data, "notarialDocumentPath").verifiedByRole}
        fields={[
          { label: "Nomor Akta", value: data.notarialDeedNumber },
          { label: "Nama Notaris", value: data.notarialIssuingAuthority },
        ]}
      />
      {data.notarialAmendmentNumber && (
        <DocCard
          title="Akta Perubahan"
          path={data.notarialAmendmentDocPath}
          fieldKey="notarialAmendmentDocPath"
          onView={handleView}
          verificationStatus={documentMetaFor(data, "notarialAmendmentDocPath").verificationStatus}
          verifiedByRole={documentMetaFor(data, "notarialAmendmentDocPath").verifiedByRole}
          fields={[
            { label: "Nomor Akta", value: data.notarialAmendmentNumber },
            { label: "Tanggal", value: data.notarialAmendmentDate ? fmtDate(data.notarialAmendmentDate) : "" },
          ]}
        />
      )}
    </div>
  );
}

function TaxTab({ data, onView }: { data: CompanyProfileData; onView: (doc: ViewingDoc) => void }) {
  const handleView = (doc: { title: string; path: string; fieldKey: string }) => {
    onView({ ...doc, category: "Perpajakan", ...documentMetaFor(data, doc.fieldKey) });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#efe2d4] bg-white p-6">
        <div className="text-[14.5px] font-extrabold text-[#20180f]">Usia Perusahaan</div>
        <div className="mb-4 mt-0.5 text-[12.5px] text-[#8a7565]">
          Menentukan dokumen kepatuhan pajak yang perlu dilampirkan
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <OptionCard label="Lebih dari 3 Tahun" desc="Perusahaan berdiri > 3 tahun" selected={data.companyAge === "OVER_3"} />
          <OptionCard label="Kurang dari 3 Tahun" desc="Perusahaan berdiri < 3 tahun" selected={data.companyAge === "UNDER_3"} />
        </div>
      </div>

      <DocCard
        title="NPWP"
        path={data.npwpDocumentPath}
        fieldKey="npwpDocumentPath"
        onView={handleView}
        verificationStatus={documentMetaFor(data, "npwpDocumentPath").verificationStatus}
        verifiedByRole={documentMetaFor(data, "npwpDocumentPath").verifiedByRole}
        fields={[
          { label: "Nomor NPWP", value: data.npwpNumber ?? "" },
          { label: "Usia Perusahaan", value: data.companyAge === "OVER_3" ? "Lebih dari 3 Tahun" : "Kurang dari 3 Tahun" },
        ]}
      />

      {data.companyAge === "UNDER_3" && data.sktNumber && (
        <DocCard
          title="Surat Keterangan Terdaftar Pajak (SKT)"
          path={data.sktDocumentPath}
          fieldKey="sktDocumentPath"
          onView={handleView}
          verificationStatus={documentMetaFor(data, "sktDocumentPath").verificationStatus}
          verifiedByRole={documentMetaFor(data, "sktDocumentPath").verifiedByRole}
          fields={[
            { label: "Nomor Surat", value: data.sktNumber },
            { label: "Tanggal Diterbitkan", value: data.sktDate ? fmtDate(data.sktDate) : "" },
            { label: "Lembaga Penerbit", value: data.sktIssuer ?? "" },
          ]}
        />
      )}

      {data.companyAge === "OVER_3" &&
        data.taxProofs
          .filter((tp) => tp.type)
          .map((tp, index) => (
            <DocCard
              key={index}
              title={`Bukti Bayar Pajak ${tp.year} — ${tp.type ? TAX_PROOF_TYPE_LABELS[tp.type] : ""}`}
              path={tp.docPath}
              fieldKey={`taxProof:${tp.year}`}
              onView={handleView}
              verificationStatus={documentMetaFor(data, `taxProof:${tp.year}`).verificationStatus}
              verifiedByRole={documentMetaFor(data, `taxProof:${tp.year}`).verifiedByRole}
              fields={[
                { label: "Nomor", value: tp.nomor ?? "" },
                { label: "Tanggal", value: tp.tanggal ?? "" },
              ]}
            />
          ))}
    </div>
  );
}

function FacilitiesTab({ data, onView }: { data: CompanyProfileData; onView: (doc: ViewingDoc) => void }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (data.locations.length === 0) {
    return <p className="text-sm text-[#8a7565]">Belum ada lokasi fasilitas yang terdaftar.</p>;
  }
  return (
    <div className="flex flex-col gap-4.5">
      {data.locations.map((loc) => {
        const address = [loc.address, loc.addressDesa, loc.addressKecamatan, loc.city, loc.province, loc.postalCode]
          .filter(Boolean)
          .join(", ");
        const FacilityIcon = LOCATION_TYPE_ICON[loc.locationType] ?? Building2;
        const isExpanded = expandedIds.has(loc.id);
        const proofDocs =
          loc.buildingStatus === "SEWA"
            ? (loc.leaseDocuments ?? []).map((entry) => ({
                key: `location:${loc.id}:lease:${entry.type}`,
                label: LEASE_DOCUMENT_TYPE_LABELS[entry.type],
                path: entry.documentPath,
              }))
            : (loc.ownershipDocuments ?? []).map((entry) => ({
                key: `location:${loc.id}:ownership:${entry.type}`,
                label: OWNERSHIP_DOCUMENT_TYPE_LABELS[entry.type],
                path: entry.documentPath,
              }));
        return (
          <div key={loc.id} className="overflow-hidden rounded-xl border-[1.5px] border-[#e0662e] bg-white">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggle(loc.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(loc.id);
                }
              }}
              className="flex cursor-pointer items-start gap-5 p-5.5"
            >
              <div className="flex size-[100px] shrink-0 items-center justify-center rounded-[10px] bg-[#f2ece5] text-[#a68f80]">
                <FacilityIcon className="size-8" />
              </div>
              <div className="flex-1">
                <div className="text-[20px] font-extrabold text-[#20180f]">{LOCATION_TYPE_LABEL[loc.locationType] ?? loc.locationType}</div>
                <div className="mt-1.5 text-[13px] text-[#594138]">{address || "—"}</div>
                {loc.googleMapsLink && (
                  <a
                    href={loc.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-2.5 inline-flex items-center gap-2"
                  >
                    <MapPin className="size-[18px] text-[#20180f]" />
                    <span className="rounded-full border border-[#d8cdbf] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#20180f]">
                      Lihat di google maps
                    </span>
                  </a>
                )}
                <div className="mt-3.5 rounded-lg bg-[#f6a04d] py-2.25 text-center text-[12.5px] font-bold text-white">
                  {BUILDING_STATUS_LABEL[loc.buildingStatus] ?? loc.buildingStatus}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {proofDocs.length === 0 && (
                  <span className="whitespace-nowrap rounded-full bg-[#fbe4de] px-3 py-1 text-[11px] font-bold text-[#c1361f]">
                    Belum ada dokumen
                  </span>
                )}
                {proofDocs.map((doc) => {
                  const href = fileHref(doc.path);
                  return (
                    <button
                      key={doc.key}
                      type="button"
                      disabled={!href}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!href || !doc.path) return;
                        onView({
                          title: doc.label,
                          path: doc.path,
                          fieldKey: doc.key,
                          category: "Fasilitas",
                          version: 1,
                          uploadedByName: null,
                          uploadedAt: data.updatedAt,
                          verificationStatus: "NOT_YET_VERIFIED",
                          verifiedByName: null,
                          verifiedAt: null,
                          verifiedByRole: null,
                          rejectionNote: null,
                        });
                      }}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#e0662e] px-3.5 py-1.75 text-[11.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#f2ece5] disabled:text-[#a68f80]"
                    >
                      <Eye className="size-3.5" />
                      {doc.label}
                    </button>
                  );
                })}
                <div className="pt-1">
                  {isExpanded ? <ChevronUp className="size-5 text-[#8a7565]" /> : <ChevronDown className="size-5 text-[#8a7565]" />}
                </div>
              </div>
            </div>
            {isExpanded && (
              <div className="grid grid-cols-2 gap-4 border-t border-[#f3e9dd] p-5.5">
                <div className="col-span-2">
                  <AddressField label="Jalan" value={loc.address} />
                </div>
                <AddressField label="Desa / Kelurahan" value={loc.addressDesa} />
                <AddressField label="Kecamatan" value={loc.addressKecamatan} />
                <AddressField label="Kota / Kabupaten" value={loc.city} />
                <AddressField label="Provinsi" value={loc.province} />
                <AddressField label="Kode Pos" value={loc.postalCode} />
                {loc.buildingStatus === "SEWA" && (
                  <div className="col-span-2 mt-1 rounded-lg bg-[#f7f2ec] p-4">
                    <div className="mb-3 text-[12.5px] font-bold text-[#20180f]">Data Perjanjian Sewa</div>
                    <div className="grid grid-cols-3 gap-4">
                      <AddressField label="Pemilik Asli" value={loc.leaseOriginalOwnerName ?? ""} />
                      <AddressField label="Tanggal Mulai Sewa" value={loc.leaseStartDate ? fmtDate(loc.leaseStartDate) : ""} />
                      <AddressField label="Tanggal Berakhir Sewa" value={loc.leaseEndDate ? fmtDate(loc.leaseEndDate) : ""} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CompanyProfileView({
  data,
  onEdit,
  allowDocumentHistory = true,
  extraTab,
}: {
  data: CompanyProfileData;
  /** Omit to render read-only (no "Edit Profile" button) — e.g. admin's Company Detail page,
   * which has no company-profile edit flow of its own. */
  onEdit?: () => void;
  /** See `DocumentViewerModal`'s `allowVersionHistory` — defaults on for Company Workspace's own
   * profile, off for any other viewer (the underlying route is scoped to the caller's own
   * companyId). */
  allowDocumentHistory?: boolean;
  /** One additional tab appended after the 5 built-in ones — e.g. admin's Company Detail page
   * adds a read-only "Partner" tab here; Company Workspace's own profile leaves this unset since
   * it already has a dedicated Partner Companies section elsewhere. */
  extraTab?: { label: string; content: React.ReactNode };
}) {
  const statusStyle = STATUS_STYLE[data.status];

  const infoBar = [
    { icon: Badge, label: "Nomor NIB", value: data.nibNumber || "—" },
    { icon: RefreshCw, label: "Tanggal Pendirian", value: data.notarialDeedIssueDate ? fmtDate(data.notarialDeedIssueDate) : "—" },
    { icon: ShieldCheck, label: "Status Perusahaan", value: STATUS_LABEL[data.status] },
    { icon: RefreshCw, label: "Terakhir Diperbarui", value: fmtDate(data.updatedAt) },
  ];

  const tabs: readonly { key: ProfileTabKey | "extra"; label: string }[] = extraTab
    ? [...PROFILE_TABS, { key: "extra" as const, label: extraTab.label }]
    : PROFILE_TABS;
  const [activeTab, setActiveTab] = useState<ProfileTabKey | "extra">("general");
  const [viewingDoc, setViewingDoc] = useState<ViewingDoc | null>(null);

  return (
    <div className="flex flex-col gap-5.5">
      <div className="rounded-[14px] border border-[#efe2d4] bg-white p-6.5">
        <div className="mb-4.5 flex items-start justify-between">
          <div>
            <div className="text-[23px] font-extrabold tracking-tight text-[#20180f]">Company Profile</div>
            <div className="mt-0.75 text-[13.5px] text-[#8a7565]">Informasi perusahaan yang terdaftar pada platform.</div>
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-[#e0662e] px-5 py-2.75 text-[13px] font-bold text-white"
            >
              Edit Profile
            </button>
          )}
        </div>
        <div className="flex items-start gap-5.5">
          <div
            className="flex size-[110px] shrink-0 items-center justify-center rounded-xl text-[28px] font-extrabold text-white"
            style={{ background: avatarColor(data.companyName) }}
          >
            {initials(data.companyName)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3.5">
              <div className="text-[30px] font-extrabold text-[#20180f]">{data.companyName}</div>
              <span
                className="rounded-full px-3.5 py-1.25 text-[11px] font-bold"
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {STATUS_LABEL[data.status]}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#8a7565]">
              <MapPin className="size-4" />
              {[data.addressKota, data.addressProvinsi].filter(Boolean).join(", ") || "—"}
            </div>
            <div className="mt-3 flex gap-2">
              {data.apiType && (
                <span className="rounded-md bg-[#e6effa] px-3 py-1 text-[11.5px] font-bold text-[#2f6fd6]">{data.apiType}</span>
              )}
              <span className="rounded-md bg-[#f2ece5] px-3 py-1 text-[11.5px] font-bold text-[#594138]">{data.companyType}</span>
            </div>
          </div>
        </div>
        <div className="mt-5.5 grid grid-cols-4 overflow-hidden rounded-[10px] border border-[#efe2d4]">
          {infoBar.map((ib, index) => (
            <InfoBarStat key={`${ib.label}-${index}`} icon={ib.icon} label={ib.label} value={ib.value} />
          ))}
        </div>
      </div>

      <div className="flex w-fit gap-1.5 rounded-[10px] bg-[#fdeadd] p-1.25">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="whitespace-nowrap rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold"
            style={
              activeTab === tab.key ? { background: "#e0662e", color: "#fff" } : { background: "transparent", color: "#8a6a54" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && <GeneralTab data={data} />}
      {activeTab === "contact" && <ContactTab data={data} />}
      {activeTab === "legal" && <LegalTab data={data} onView={setViewingDoc} />}
      {activeTab === "tax" && <TaxTab data={data} onView={setViewingDoc} />}
      {activeTab === "facilities" && <FacilitiesTab data={data} onView={setViewingDoc} />}
      {activeTab === "extra" && extraTab?.content}

      {viewingDoc && (
        <DocumentViewerModal
          doc={viewingDoc}
          companyName={data.companyName}
          allowVersionHistory={allowDocumentHistory}
          onClose={() => setViewingDoc(null)}
          onSelectVersion={(entry, title) =>
            setViewingDoc((prev) =>
              prev
                ? {
                    ...prev,
                    title,
                    path: entry.path,
                    version: entry.version,
                    uploadedByName: entry.uploadedByName,
                    uploadedAt: entry.uploadedAt,
                    verificationStatus: entry.verificationStatus,
                    verifiedByName: entry.verifiedByName,
                    verifiedAt: entry.verifiedAt,
                    rejectionNote: entry.rejectionNote,
                  }
                : prev,
            )
          }
        />
      )}
    </div>
  );
}
