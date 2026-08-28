"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  Factory,
  FileText,
  Folder,
  HardDrive,
  History,
  Info,
  MapPin,
  PenLine,
  Undo2,
  UserCircle2,
  Warehouse,
  X,
} from "lucide-react";

import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist, checklistItemCode } from "@/modules/verifikator-workspace/schema";
import { buildDisplayFileName } from "@/lib/document-filename";
import { composeLocationAddress, OWNERSHIP_DOCUMENT_TYPE_LABELS, LEASE_DOCUMENT_TYPE_LABELS } from "@/modules/shared/schema";
import { TERMINAL_STATUSES, type ApplicationStatusValue } from "../status";
import { getApplicationStatusDisplay, WORKFLOW_STAGE_LABELS } from "../application-status-display";

type VerificationStatusValue = "NOT_YET_VERIFIED" | "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" | "EXPIRED";

type VerifiedByRole = "CR" | "VERIFIKATOR";

type DocumentMetaEntry = {
  version: number;
  uploadedByName: string | null;
  uploadedAt: string;
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verifiedByRole: VerifiedByRole | null;
  rejectionNote: string | null;
};

type LocationVisitStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type ChecklistItemData = { id: string; category: string; item: string; result: "PASS" | "FAIL" | "NA" | null; notes?: string };

type LocationVisitData = {
  id: string;
  status: LocationVisitStatusValue;
  locationType: string;
  address: string;
  city: string | null;
  scheduledDate: string | null;
  submittedAt: string | null;
  checklist: ChecklistItemData[] | null;
  reportSummary: string | null;
  fieldObservationNotes: string | null;
};

type SurveyReportData = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED";
  notes: string | null;
  submittedAt: string | null;
};

type AssignmentData = {
  id: string;
  assignmentNumber: string;
  status: "ASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "SUBMITTED" | "RETURNED" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  surveyor: { name: string } | null;
  verifikator: { name: string } | null;
  technicalReviewer: { name: string } | null;
  scheduledDate: string | null;
  dueDate: string | null;
  locationVisits: LocationVisitData[];
  report: SurveyReportData | null;
  createdAt: string;
};

type ApplicationMessageData = {
  id: string;
  direction: "IN" | "OUT" | "SYSTEM";
  text: string;
  createdAt: string;
};

type CompanyAddressData = {
  companyName: string;
  apiType: string | null;
  companyType: string;
  investmentStatus: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string | null;
  addressJalan: string | null;
  addressDesa: string | null;
  addressKecamatan: string | null;
  addressKota: string | null;
  addressProvinsi: string | null;
  addressKodePos: string | null;
};

type ApplicationDetailData = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  status: ApplicationStatusValue;
  displayStatus: ApplicationStatusValue;
  createdAt: string;
  updatedAt: string;
  payload: ApplicationWizardValues;
  assignedSurveyorName: string | null;
  surveyDate: string | null;
  documentStatuses: Record<string, DocumentMetaEntry | undefined>;
  assignments: AssignmentData[];
  messages: ApplicationMessageData[];
  company: CompanyAddressData | null;
};

const DETAIL_TABS = [
  "Overview",
  "Scope",
  "Company Information",
  "Facilities",
  "Documents",
  "Verification",
  "History",
  "Laporan",
] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

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
  status: VerificationStatusValue | null | undefined,
  verifiedByRole: VerifiedByRole | null | undefined,
): { label: string; bg: string; color: string } | null {
  if (!status) return null;
  if (status === "VERIFIED" && verifiedByRole === "CR") {
    return { label: "Valid (CR) — Menunggu Verifikator", bg: "#fdf0d5", color: "#a3690a" };
  }
  return VERIFICATION_STATUS_STYLE[status];
}

const LOCATION_VISIT_STYLE: Record<LocationVisitStatusValue, { label: string; bg: string; color: string }> = {
  NOT_STARTED: { label: "Belum Disurvei", bg: "#f2ece5", color: "#8a7565" },
  IN_PROGRESS: { label: "Sedang Disurvei", bg: "#fff4e0", color: "#b3781c" },
  COMPLETED: { label: "Terverifikasi", bg: "#e2f7ea", color: "#1a7a4c" },
};

const ASSIGNMENT_STATUS_STYLE: Record<AssignmentData["status"], { label: string; bg: string; color: string }> = {
  ASSIGNED: { label: "Assigned", bg: "#f2ece5", color: "#8a7565" },
  SCHEDULED: { label: "Scheduled", bg: "#e6f0fd", color: "#2f6fd6" },
  IN_PROGRESS: { label: "In Progress", bg: "#fff4e0", color: "#b3781c" },
  SUBMITTED: { label: "Submitted", bg: "#fdeadd", color: "#c14a1f" },
  RETURNED: { label: "Returned", bg: "#faf1de", color: "#a6791f" },
  COMPLETED: { label: "Completed", bg: "#e2f7ea", color: "#1a7a4c" },
};

const HIGHLIGHT = { borderColor: "#e0662e", bg: "#fdeadd", color: "#c14a1f" };
const NEUTRAL = { borderColor: "#e8dccd", bg: "#fff", color: "#20180f" };

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };
const BUILDING_STATUS_LABEL: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };
const LOCATION_TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  PABRIK: Factory,
  GUDANG: Warehouse,
  KANTOR: Building2,
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

function fileHref(path: string | null | undefined): string | null {
  return path ? `/api/files?path=${encodeURIComponent(path)}` : null;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#efe2d4] bg-white p-4">
      <div className="mb-2 text-[10.5px] font-bold tracking-wide text-[#a68f80]">{label}</div>
      <div className="flex items-center gap-2 text-[14px] font-bold text-[#20180f]">
        <Icon className="size-[18px] shrink-0 text-[#e0662e]" />
        {children}
      </div>
    </div>
  );
}

function TabField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[10px] border border-[#efe2d4] bg-white p-4">
      <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#9c8a79]">{label}</div>
      <div className="text-[13.5px] font-semibold text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

function OptionCard({ label, desc, selected }: { label: string; desc?: string; selected: boolean }) {
  const tone = selected ? HIGHLIGHT : NEUTRAL;
  return (
    <div className="relative rounded-[9px] border-[1.5px] p-4" style={{ borderColor: tone.borderColor, background: tone.bg }}>
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

function InfoRow({
  icon: Icon,
  label,
  collapsed,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <div title={label} className="flex justify-center py-0.5">
        <Icon className="size-4 text-[#8a7565]" />
      </div>
    );
  }
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

function ComingSoonPanel({ tab }: { tab: string }) {
  return (
    <div className="rounded-[10px] border border-[#efe2d4] bg-white p-10 text-center text-[13px] text-[#9c8a79]">
      Konten {tab} akan tampil di sini. Modul ini akan tersedia di iterasi berikutnya.
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-[10px] border border-[#efe2d4] bg-white p-6 text-center text-[13px] text-[#9c8a79]">{text}</p>
  );
}

type ViewingDoc = {
  key: string;
  title: string;
  category: string;
  path: string;
  status?: VerificationStatusValue | null;
  verifiedByRole?: VerifiedByRole | null;
  version?: number | null;
  uploadedByName?: string | null;
  uploadedAt?: string | null;
};

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
  applicationId,
  docKey,
  docTitle,
  entityName,
  canUpload,
  onClose,
  onSelectVersion,
  onUploaded,
}: {
  applicationId: string;
  docKey: string;
  docTitle: string;
  entityName: string;
  canUpload: boolean;
  onClose: () => void;
  onSelectVersion: (path: string, version: number) => void;
  onUploaded: () => void;
}) {
  const documentCode = checklistItemCode(docKey, docTitle);
  const historyQueryKey = ["company-workspace", "applications", applicationId, "documents", docKey, "history"];
  const { data, isLoading, refetch } = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${applicationId}/documents/${encodeURIComponent(docKey)}/history`);
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

      const saveRes = await fetch(`/api/company-workspace/applications/${applicationId}/documents/${encodeURIComponent(docKey)}/history`, {
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
            <X className="size-5" />
          </button>
        </div>

        {canUpload && (
          <div className="px-5.5 pb-3.5">
            <label
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] border-[1.5px] border-dashed border-[#b7cdf0] bg-[#eaf1fc] p-3.5 text-center ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            >
              <ArrowUpFromLine className="size-5 text-[#2f6fe0]" />
              <span className="text-[12.5px] font-bold text-[#2f6fe0]">{isUploading ? "Mengunggah..." : "Upload New Document"}</span>
              <span className="text-[11px] text-[#6b8bc4]">Klik untuk memilih file PDF/JPG/PNG</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={isUploading} onChange={handleUpload} />
            </label>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 pb-3">
          {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
          {!isLoading && versions.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada riwayat dokumen.</p>}
          {versions.map((v) => {
            const fileName = buildDisplayFileName(documentCode, entityName, v.version, v.path);
            const href = fileHref(v.path)!;
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
                    <FileText className="size-[18px] text-[#8a7565]" />
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
                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(v.path, v.version);
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

function DocumentViewerModal({
  doc,
  applicationId,
  entityName,
  canUpload,
  onClose,
  onUploaded,
}: {
  doc: ViewingDoc;
  applicationId: string;
  entityName: string;
  canUpload: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [previewPath, setPreviewPath] = useState(doc.path);
  const [previewVersion, setPreviewVersion] = useState(doc.version ?? 1);
  const href = fileHref(previewPath)!;
  const format = (previewPath.split(".").pop() ?? "").toUpperCase();
  const documentCode = checklistItemCode(doc.key, doc.title);
  const displayName = buildDisplayFileName(documentCode, entityName, previewVersion, previewPath);
  const [collapsed, setCollapsed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const statusStyle = verificationStatusDisplay(doc.status, doc.verifiedByRole);

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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div className="text-[16px] font-extrabold text-[#20180f]">{doc.title}</div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e8dccd]">
            <div className="flex items-center justify-between bg-[#22252b] px-4 py-2.5">
              <span className="truncate text-[12.5px] text-[#e8e6e3]">{displayName}</span>
              <a href={href} download={displayName} aria-label="Download" className="flex shrink-0 items-center gap-1.5 text-[#a68f80] hover:text-[#e8e6e3]">
                <Download className="size-4" />
              </a>
            </div>
            <div className="flex-1 overflow-auto bg-[#2c2f36]">
              {isImagePath(previewPath) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={doc.title} className="mx-auto max-h-[70vh] w-auto" />
              ) : (
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
                <ChevronRight className="mx-auto size-4.5 text-[#4a5a70]" />
              ) : (
                <ChevronLeft className="size-4.5 text-[#4a5a70]" />
              )}
            </button>
            <div className={`flex flex-col gap-3 ${collapsed ? "px-2 py-3" : "p-4"}`}>
              <InfoRow icon={FileText} label="Document Name" collapsed={collapsed}>
                {displayName}
              </InfoRow>
              <InfoRow icon={Folder} label="Category" collapsed={collapsed}>
                {doc.category}
              </InfoRow>
              <InfoRow icon={FileText} label="Format" collapsed={collapsed}>
                {format}
              </InfoRow>
              <InfoRow icon={HardDrive} label="File Size" collapsed={collapsed}>
                {fileSize ?? "Memuat..."}
              </InfoRow>
              {statusStyle && (
                <InfoRow icon={CheckCircle2} label="Status" collapsed={collapsed}>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: statusStyle.color, color: "#fff" }}>
                    <CheckCircle2 className="size-3.5" />
                    {statusStyle.label}
                  </span>
                </InfoRow>
              )}
              <div className={collapsed ? "" : "border-t border-[#f5ebe1] pt-3"}>
                {collapsed ? (
                  <button type="button" onClick={() => setShowVersionHistory(true)} title="Version" className="flex w-full justify-center py-0.5">
                    <History className="size-4 text-[#8a7565]" />
                  </button>
                ) : (
                  <InfoRow icon={History} label="Version">
                    <button
                      type="button"
                      onClick={() => setShowVersionHistory(true)}
                      className="text-[#2f6fd6] underline decoration-dotted underline-offset-2"
                    >
                      v{doc.version ?? 1}
                    </button>
                  </InfoRow>
                )}
              </div>
              <InfoRow icon={UserCircle2} label="Uploaded By" collapsed={collapsed}>
                {doc.uploadedByName ?? "—"}
              </InfoRow>
              <InfoRow icon={Calendar} label="Upload Date" collapsed={collapsed}>
                {fmtDate(doc.uploadedAt)}
              </InfoRow>
              <InfoRow icon={Info} label="Path Penyimpanan" collapsed={collapsed}>
                <span className="break-all font-normal text-[#8a7565]">{previewPath}</span>
              </InfoRow>
            </div>
          </div>
        </div>
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          applicationId={applicationId}
          docKey={doc.key}
          docTitle={doc.title}
          entityName={entityName}
          canUpload={canUpload}
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

function ReportViewModal({ label, href, onClose }: { label: string; href: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div className="text-[16px] font-extrabold text-[#20180f]">Laporan Verifikasi Lapangan — {label}</div>
          <div className="flex items-center gap-2">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
            >
              Buka di Tab Baru
            </a>
            <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-[#f2f0ee]">
          <iframe src={href} title={`Laporan ${label}`} className="h-full w-full border-0" />
        </div>
      </div>
    </div>
  );
}

type DocEntry = {
  key: string;
  title: string;
  category: string;
  path: string;
  status: VerificationStatusValue | null;
  verifiedByRole: VerifiedByRole | null;
  version: number | null;
  uploadedByName: string | null;
  uploadedAt: string | null;
};

/**
 * Thin wrapper over the verifikator workspace's own checklist builder — same
 * function, same key namespace ("nib", "location:<id>:ownership", etc.) — so
 * a document's version history/status is the same real record everywhere,
 * not a second parallel accounting of the same payload.
 */
function buildDocumentEntries(payload: ApplicationWizardValues, documentStatuses: Record<string, DocumentMetaEntry | undefined>): DocEntry[] {
  return buildDocumentChecklist(payload)
    .filter((item) => item.documentPath)
    .map((item) => {
      const meta = documentStatuses[item.key];
      return {
        key: item.key,
        title: item.label,
        category: item.category,
        path: item.documentPath!,
        status: meta?.verificationStatus ?? null,
        verifiedByRole: meta?.verifiedByRole ?? null,
        version: meta?.version ?? null,
        uploadedByName: meta?.uploadedByName ?? null,
        uploadedAt: meta?.uploadedAt ?? null,
      };
    });
}

function findLocationVisit(assignments: AssignmentData[], locationType: string, composedAddress: string): LocationVisitData | null {
  for (const assignment of assignments) {
    const match = assignment.locationVisits.find((visit) => visit.locationType === locationType && visit.address === composedAddress);
    if (match) return match;
  }
  return null;
}

function MessageIcon({ direction }: { direction: ApplicationMessageData["direction"] }) {
  if (direction === "SYSTEM") return <Bot className="size-4" />;
  if (direction === "IN") return <ArrowDownToLine className="size-4" />;
  return <ArrowUpFromLine className="size-4" />;
}

type Props = { id: string };

export function CompanyApplicationDetail({ id }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [viewingDoc, setViewingDoc] = useState<ViewingDoc | null>(null);
  const [viewingReport, setViewingReport] = useState<{ label: string; href: string } | null>(null);
  const [expandedFacilityIds, setExpandedFacilityIds] = useState<Set<string>>(new Set());

  function toggleFacility(id: string) {
    setExpandedFacilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "applications", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}`);
      if (!response.ok) throw new Error("Permohonan tidak ditemukan");
      const json = (await response.json()) as { data: ApplicationDetailData };
      return json.data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menarik permohonan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Permohonan berhasil ditarik.");
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menarik permohonan");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}/duplicate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menduplikasi permohonan");
      }
      return response.json() as Promise<{ id: string; applicationNumber: string }>;
    },
    onSuccess: (result) => {
      toast.success(`Draft baru dibuat: ${result.applicationNumber}`);
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
      router.push(`/company-workspace/applications/${result.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menduplikasi permohonan");
    },
  });

  if (isLoading) {
    return <p className="p-10 text-center text-[13px] text-[#a68f80]">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="p-10 text-center text-[13px] text-[#c1361f]">Permohonan tidak ditemukan, atau bukan milik perusahaan Anda.</p>;
  }

  const { payload, company } = data;
  const isTerminal = TERMINAL_STATUSES.includes(data.status);
  const display = getApplicationStatusDisplay(data.displayStatus);
  const documents = buildDocumentEntries(payload, data.documentStatuses);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-7">
      <div className="flex items-center gap-2 text-[12.5px] text-[#9c8a79]">
        <Link href="/company-workspace/applications" className="hover:underline">
          Applications
        </Link>
        <span className="text-[#c9b9a8]">/</span>
        <span className="font-semibold text-[#20180f]">{data.applicationNumber}</span>
      </div>

      {data.status === "RETURNED" && (
        <div className="flex items-start gap-3 rounded-xl border border-[#f0c78a] bg-[#fdf0d5] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#a3690a]" />
          <div className="flex-1">
            <div className="text-[13.5px] font-bold text-[#7a4a10]">Permohonan Dikembalikan untuk Revisi</div>
            <p className="mt-0.5 text-[12.5px] text-[#8a6224]">
              Verifikator mengembalikan permohonan ini untuk diperbaiki. Lihat tab History untuk alasan lengkap, lalu klik
              &quot;Revisi Permohonan&quot; untuk membuka kembali formulir dan mengirim ulang.
            </p>
          </div>
          <Link
            href={`/company-workspace/applications/new?draftId=${id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#a3690a] px-3.5 py-2 text-[12.5px] font-bold text-white"
          >
            <PenLine className="size-3.5" />
            Revisi Permohonan
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-[26px] font-extrabold tracking-tight text-[#20180f]">{data.applicationNumber}</div>
            <span className="rounded-full bg-[#e6f0fd] px-3 py-1 text-[11.5px] font-bold text-[#2f6fd6]">{data.verificationType}</span>
            <span className="inline-flex items-center gap-1.25 rounded-full px-3 py-1 text-[11.5px] font-bold" style={{ background: display.bgSoft, color: display.color }}>
              {display.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3.5 text-[12.5px] text-[#8a7565]">
            <span className="inline-flex items-center gap-1.25">
              <Calendar className="size-3.5" />
              Created {fmtDate(data.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.25">
              <Calendar className="size-3.5" />
              Updated {fmtDate(data.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.status === "DRAFT" && (
            <Link href={`/company-workspace/applications/new?draftId=${id}`} className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.25 text-[12.5px] font-bold text-white">
              <PenLine className="size-3.5" />
              Continue Editing
            </Link>
          )}
          {data.status === "RETURNED" && (
            <Link href={`/company-workspace/applications/new?draftId=${id}`} className="flex items-center gap-1.5 rounded-lg bg-[#a3690a] px-4 py-2.25 text-[12.5px] font-bold text-white">
              <PenLine className="size-3.5" />
              Revisi Permohonan
            </Link>
          )}
          <button
            type="button"
            disabled={duplicateMutation.isPending}
            onClick={() => duplicateMutation.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.25 text-[12.5px] font-semibold text-[#261813] disabled:opacity-60"
          >
            <Copy className="size-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            disabled={isTerminal || withdrawMutation.isPending}
            onClick={() => {
              if (confirm(`Tarik permohonan ${data.applicationNumber}?`)) {
                withdrawMutation.mutate();
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.25 text-[12.5px] font-semibold text-[#261813] disabled:opacity-40"
          >
            <Undo2 className="size-3.5" />
            Withdraw
          </button>
          <Link href="/company-workspace/applications" className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.25 text-[12.5px] font-semibold text-[#261813]">
            <ArrowLeft className="size-3.5" />
            Kembali
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatCard icon={FileText} label="WORKFLOW STAGE">
          {display.label}
        </StatCard>
        <StatCard icon={UserCircle2} label="ASSIGNED SURVEYOR">
          {data.assignedSurveyorName ?? "—"}
        </StatCard>
        <StatCard icon={Calendar} label="SURVEY DATE">
          {fmtDate(data.surveyDate)}
        </StatCard>
        <div className="rounded-[10px] border border-[#efe2d4] bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10.5px] font-bold tracking-wide text-[#a68f80]">PROGRESS</div>
            <div className="text-[12px] font-bold text-[#e0662e]">{display.progress}%</div>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#f2f0ee]">
            <div className="h-full rounded-full bg-[#e0662e]" style={{ width: `${display.progress}%` }} />
          </div>
        </div>
      </div>

      {!isTerminal && (
        <div className="rounded-[10px] border border-[#efe2d4] bg-white px-6 py-5">
          <div className="flex items-start">
            {WORKFLOW_STAGE_LABELS.map((label, index) => {
              const done = index < display.stageIndex;
              const active = index === display.stageIndex;
              return (
                <div key={label} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : done || active ? "bg-[#e0662e]" : "bg-[#e8dccd]"}`} />
                    <div
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-full border-2"
                      style={{ background: done ? "#e0662e" : "#fff", borderColor: done || active ? "#e0662e" : "#e1d8cc" }}
                    >
                      {done ? <CheckCircle2 className="size-3.5 text-white" /> : <ClipboardCheck className="size-3.5" style={{ color: active ? "#e0662e" : "#c9bcae" }} />}
                    </div>
                    <div className={`h-0.5 flex-1 ${index === WORKFLOW_STAGE_LABELS.length - 1 ? "bg-transparent" : done ? "bg-[#e0662e]" : "bg-[#e8dccd]"}`} />
                  </div>
                  <div className="mt-2 text-center text-[11.5px] font-semibold" style={{ color: active ? "#e0662e" : done ? "#20180f" : "#a68f80" }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-[#efe2d4]">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold"
            style={{ color: activeTab === tab ? "#20180f" : "#8a7565", borderBottom: activeTab === tab ? "2px solid #e0662e" : "2px solid transparent" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <TabField label="Jenis Verifikasi" value={data.verificationType} />
          <TabField label="Kategori Permohonan" value={data.applicationCategory} />
          <TabField label="Tanggal Pengajuan" value={fmtDate(data.createdAt)} />
          <TabField label="Surveyor Ditugaskan" value={data.assignedSurveyorName} />
          <TabField label="Progress" value={`${display.progress}%`} />
        </div>
      )}

      {activeTab === "Scope" && <ComingSoonPanel tab="Scope" />}

      {activeTab === "Company Information" && (
        <div className="rounded-xl border border-[#efe2d4] bg-white p-7">
          <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Jenis API</div>
          <div className="mb-5.5 grid grid-cols-2 gap-3">
            {(["API-P", "API-U"] as const).map((code) => (
              <OptionCard key={code} label={code} desc={code === "API-P" ? "Angka Pengenal Impor Produsen" : "Angka Pengenal Impor Umum"} selected={company?.apiType === code} />
            ))}
          </div>

          <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Tipe Perusahaan</div>
          <div className="mb-5.5 grid grid-cols-3 gap-3">
            {["PT", "CV", "Firma", "Koperasi", "Perusahaan Perorangan"].map((label) => (
              <div key={label} className="text-center">
                <OptionCard label={label} selected={company?.companyType === label} />
              </div>
            ))}
          </div>

          <div className="mb-2.5 text-[13px] font-bold text-[#20180f]">Status Investasi</div>
          <div className="mb-6.5 grid grid-cols-2 gap-3">
            {(["PMDN", "PMA"] as const).map((code) => (
              <OptionCard key={code} label={code} desc={code === "PMDN" ? "Penanaman Modal Dalam Negeri" : "Penanaman Modal Asing"} selected={company?.investmentStatus === code} />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <AddressField label="Jalan" value={company?.addressJalan ?? ""} />
            <div className="grid grid-cols-2 gap-5">
              <AddressField label="Desa / Kelurahan" value={company?.addressDesa ?? ""} />
              <AddressField label="Kecamatan" value={company?.addressKecamatan ?? ""} />
              <AddressField label="Kota / Kabupaten" value={company?.addressKota ?? ""} />
              <AddressField label="Provinsi" value={company?.addressProvinsi ?? ""} />
              <AddressField label="Kode Pos" value={company?.addressKodePos ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <AddressField label="Nomor Perusahaan (Telepon)" value={company?.companyPhone ?? payload.companyPhone} />
              <AddressField label="Email Perusahaan" value={company?.companyEmail ?? payload.companyEmail} />
            </div>
            <AddressField label="Website" value={company?.companyWebsite ?? payload.companyWebsite ?? ""} />
            <div className="grid grid-cols-2 gap-5 border-t border-[#f5ebe1] pt-4">
              <AddressField label="Nama PIC Permohonan" value={payload.contactFullName} />
              <AddressField label="Jabatan PIC" value={payload.contactDesignation} />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <AddressField label="Telepon PIC" value={payload.contactPhone} />
              <AddressField label="Email PIC" value={payload.contactEmail} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Facilities" && (
        <div className="flex flex-col gap-4">
          {(payload.locations?.length ?? 0) === 0 && <EmptyState text="Belum ada fasilitas/lokasi terdaftar." />}
          {payload.locations?.map((location) => {
            const address = [location.address, location.addressDesa, location.addressKecamatan, location.city, location.province, location.postalCode].filter(Boolean).join(", ");
            const FacilityIcon = LOCATION_TYPE_ICON[location.locationType] ?? Building2;
            const visit = findLocationVisit(data.assignments, location.locationType, composeLocationAddress(location));
            const visitStyle = LOCATION_VISIT_STYLE[visit?.status ?? "NOT_STARTED"];
            const proofDocs =
              location.buildingStatus === "SEWA"
                ? (location.leaseDocuments ?? []).map((entry) => ({ key: `location:${location.id}:lease:${entry.type}`, label: LEASE_DOCUMENT_TYPE_LABELS[entry.type], path: entry.documentPath }))
                : (location.ownershipDocuments ?? []).map((entry) => ({ key: `location:${location.id}:ownership:${entry.type}`, label: OWNERSHIP_DOCUMENT_TYPE_LABELS[entry.type], path: entry.documentPath }));
            const isExpanded = expandedFacilityIds.has(location.id);
            return (
              <div key={location.id} className="overflow-hidden rounded-xl border-[1.5px] border-[#e0662e] bg-white">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleFacility(location.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleFacility(location.id);
                    }
                  }}
                  className="flex cursor-pointer items-start gap-5 p-5.5"
                >
                  <div className="flex size-[90px] shrink-0 items-center justify-center rounded-[10px] bg-[#f2ece5] text-[#a68f80]">
                    <FacilityIcon className="size-8" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[18px] font-extrabold text-[#20180f]">{LOCATION_TYPE_LABEL[location.locationType] ?? location.locationType}</div>
                    <div className="mt-1.5 text-[13px] text-[#594138]">{address || "—"}</div>
                    {location.googleMapsLink && (
                      <a
                        href={location.googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2.5 inline-flex items-center gap-2"
                      >
                        <MapPin className="size-4 text-[#20180f]" />
                        <span className="rounded-full border border-[#d8cdbf] px-3 py-1 text-[12px] font-semibold text-[#20180f]">Lihat di google maps</span>
                      </a>
                    )}
                    <div className="mt-3 rounded-lg bg-[#f6a04d] py-2 text-center text-[12px] font-bold text-white">
                      {BUILDING_STATUS_LABEL[location.buildingStatus] ?? location.buildingStatus}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2.5">
                    <span className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: visitStyle.bg, color: visitStyle.color }}>
                      {visitStyle.label}
                    </span>
                    {proofDocs.filter((doc) => fileHref(doc.path)).map((doc) => (
                      <button
                        key={doc.key}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const meta = data.documentStatuses[doc.key];
                          setViewingDoc({
                            key: doc.key,
                            title: doc.label,
                            category: "Fasilitas",
                            path: doc.path as string,
                            version: meta?.version ?? null,
                            uploadedByName: meta?.uploadedByName ?? null,
                            uploadedAt: meta?.uploadedAt ?? null,
                          });
                        }}
                        className="rounded-lg bg-[#e0662e] px-4.5 py-2.25 text-[12.5px] font-bold text-white"
                      >
                        {doc.label}
                      </button>
                    ))}
                    {isExpanded ? <ChevronUp className="size-5 text-[#8a7565]" /> : <ChevronDown className="size-5 text-[#8a7565]" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-4 border-t border-[#f3e9dd] p-5.5">
                    <div className="col-span-2">
                      <AddressField label="Jalan" value={location.address} />
                    </div>
                    <AddressField label="Desa / Kelurahan" value={location.addressDesa} />
                    <AddressField label="Kecamatan" value={location.addressKecamatan} />
                    <AddressField label="Kota / Kabupaten" value={location.city} />
                    <AddressField label="Provinsi" value={location.province} />
                    <AddressField label="Kode Pos" value={location.postalCode} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "Documents" && (
        <div className="flex flex-col gap-3.5">
          {documents.length === 0 && <EmptyState text="Belum ada dokumen tercatat pada permohonan ini." />}
          {documents.map((doc) => {
            const statusStyle = verificationStatusDisplay(doc.status, doc.verifiedByRole);
            return (
              <div key={doc.key} className="flex items-center gap-4 rounded-xl border border-[#efe2d4] bg-white p-4.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#faf1e8]">
                  <FileText className="size-5 text-[#8a7565]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-[#20180f]">{doc.title}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-[#c14a1f]">{doc.category}</div>
                </div>
                {statusStyle && (
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setViewingDoc({
                      key: doc.key,
                      title: doc.title,
                      category: doc.category,
                      path: doc.path,
                      status: doc.status,
                      verifiedByRole: doc.verifiedByRole,
                      version: doc.version,
                      uploadedByName: doc.uploadedByName,
                      uploadedAt: doc.uploadedAt,
                    })
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-3.5 py-2 text-[12px] font-bold text-white"
                >
                  <Eye className="size-3.5" />
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "Verification" && (
        <div className="flex flex-col gap-4">
          {data.assignments.length === 0 && <EmptyState text="Belum ada assignment verifikasi untuk permohonan ini." />}
          {data.assignments.map((assignment) => {
            const statusStyle = ASSIGNMENT_STATUS_STYLE[assignment.status];
            return (
              <div key={assignment.id} className="rounded-xl border border-[#efe2d4] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-extrabold text-[#20180f]">{assignment.assignmentNumber}</div>
                    <div className="mt-0.5 text-[11.5px] text-[#8a7565]">Dibuat {fmtDate(assignment.createdAt)}</div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                  <TabField label="Surveyor" value={assignment.surveyor?.name} />
                  <TabField label="Verifikator" value={assignment.verifikator?.name} />
                  <TabField label="Technical Reviewer" value={assignment.technicalReviewer?.name} />
                  <TabField label="Jadwal Survey" value={fmtDate(assignment.scheduledDate)} />
                </div>
                {assignment.locationVisits.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="text-[11.5px] font-bold text-[#594138]">Lokasi Disurvei</div>
                    {assignment.locationVisits.map((visit) => {
                      const visitStyle = LOCATION_VISIT_STYLE[visit.status];
                      return (
                        <div key={visit.id} className="flex items-center justify-between rounded-lg border border-[#efe2d4] px-3.5 py-2.5">
                          <div>
                            <div className="text-[12.5px] font-bold text-[#20180f]">{LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType}</div>
                            <div className="text-[11.5px] text-[#8a7565]">{visit.address}</div>
                          </div>
                          <span className="rounded-full px-2.5 py-0.75 text-[10.5px] font-bold" style={{ background: visitStyle.bg, color: visitStyle.color }}>
                            {visitStyle.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "History" && (
        <div className="rounded-xl border border-[#efe2d4] bg-white p-6">
          {data.messages.length === 0 && <EmptyState text="Belum ada riwayat komunikasi untuk permohonan ini." />}
          {data.messages.length > 0 && (
            <div className="flex flex-col gap-5">
              {data.messages.map((message, index) => (
                <div key={message.id} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: message.direction === "SYSTEM" ? "#f2ece5" : message.direction === "IN" ? "#e6f0fd" : "#fdeadd",
                        color: message.direction === "SYSTEM" ? "#8a7565" : message.direction === "IN" ? "#2f6fd6" : "#e0662e",
                      }}
                    >
                      <MessageIcon direction={message.direction} />
                    </div>
                    {index < data.messages.length - 1 && <div className="mt-1 w-px flex-1 bg-[#f0e2d3]" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-[#20180f]">{message.direction === "SYSTEM" ? "Sistem" : message.direction === "IN" ? "Diterima" : "Terkirim"}</span>
                      <span className="text-[11.5px] text-[#8a7565]">{fmtDateTime(message.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-[#594138]">{message.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Laporan" && (
        <div className="flex flex-col gap-3.5">
          {data.assignments.flatMap((a) => a.locationVisits).length === 0 && <EmptyState text="Belum ada laporan survey tersedia." />}
          {data.assignments.map((assignment) =>
            assignment.locationVisits.map((visit) => {
              const label = LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType;
              const checklist = visit.checklist ?? [];
              const passCount = checklist.filter((c) => c.result === "PASS").length;
              const failCount = checklist.filter((c) => c.result === "FAIL").length;
              const naCount = checklist.filter((c) => c.result === "NA").length;
              const notes = visit.reportSummary || visit.fieldObservationNotes;
              return (
                <div key={visit.id} className="rounded-xl border border-[#efe2d4] bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fdeadd] text-[#e0662e]">
                        <FileText className="size-4.5" />
                      </div>
                      <div>
                        <div className="text-[13.5px] font-extrabold text-[#20180f]">Laporan Survey — {label}</div>
                        <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
                          {visit.status === "COMPLETED" ? `Dikirim ${fmtDate(visit.submittedAt)} · ${assignment.surveyor?.name ?? "—"}` : "Survei lokasi ini belum selesai"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                        style={{ background: LOCATION_VISIT_STYLE[visit.status].bg, color: LOCATION_VISIT_STYLE[visit.status].color }}
                      >
                        {LOCATION_VISIT_STYLE[visit.status].label}
                      </span>
                      {visit.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingReport({
                              label,
                              href: `/company-workspace/assignments/${assignment.assignmentNumber}/report/${visit.id}`,
                            })
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-3.5 py-1.75 text-[12px] font-bold text-white"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  {visit.status === "COMPLETED" && (
                    <div className="mt-3.5 flex flex-col gap-2.5 border-t border-[#f5ebe1] pt-3.5">
                      {checklist.length > 0 && (
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                          <span className="font-bold text-[#1a7a4c]">{passCount} Sesuai</span>
                          <span className="font-bold text-[#c1361f]">{failCount} Tidak Sesuai</span>
                          <span className="font-bold text-[#8a7565]">{naCount} N/A</span>
                        </div>
                      )}
                      {notes && <p className="rounded-lg bg-[#f7f2ec] p-3 text-[12.5px] leading-relaxed text-[#594138]">{notes}</p>}
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>
      )}

      {viewingDoc && (
        <DocumentViewerModal
          doc={viewingDoc}
          applicationId={data.id}
          entityName={data.company?.companyName ?? data.applicationNumber}
          canUpload={!isTerminal}
          onClose={() => setViewingDoc(null)}
          onUploaded={() => queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications", "detail", id] })}
        />
      )}
      {viewingReport && <ReportViewModal label={viewingReport.label} href={viewingReport.href} onClose={() => setViewingReport(null)} />}
    </div>
  );
}
