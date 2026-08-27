"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { buildDisplayFileName } from "@/lib/document-filename";
import { checklistItemCode } from "../../schema";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  DOC_VERIFICATION_STATUSES,
  DOC_VERIFICATION_STATUS_BADGE,
  DOC_VERIFICATION_STATUS_LABELS,
  type DocVerificationStatusValue,
} from "../../status";
import type { AssignmentStatusValue } from "../../status";
import { COMPLIANCE_SECTION_DEFS, getComplianceDef } from "../../document-compliance-defs";
import { getChecklistItems, type ChecklistItemDef } from "../../document-checklist-items";

type ChecklistResultValue = "PASS" | "FAIL" | "NA";
type ChecklistItemResult = { result: ChecklistResultValue | null; note: string | null; criteriaChecked: boolean[] };

type DocumentRow = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  status: DocVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
  version: number;
  uploadedByName: string | null;
  uploadedAt: string | null;
  checklistResult: Record<string, ChecklistItemResult> | null;
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

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
function isImagePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

function docStatusLabel(row: DocumentRow): { label: string; bg: string; color: string } {
  if (!row.documentPath) return { label: "Belum Diunggah", bg: "#fbe4de", color: "#c1361f" };
  if (row.status === "VALID") return { label: "Valid", bg: "#e2f7ea", color: "#1a9850" };
  return { label: "Uploaded", bg: "#e6effa", color: "#2f6fe0" };
}

function reviewStatusLabel(row: DocumentRow): string {
  if (row.status === "PENDING" && !row.documentPath) return "Belum Ada";
  return DOC_VERIFICATION_STATUS_LABELS[row.status];
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

const CHECKLIST_RESULT_STYLE: Record<ChecklistResultValue, { label: string; bg: string }> = {
  PASS: { label: "Sesuai", bg: "#1a9850" },
  FAIL: { label: "Tidak Sesuai", bg: "#c1361f" },
  NA: { label: "Perlu Klarifikasi", bg: "#c9820f" },
};

function ChecklistItemRow({
  index,
  item,
  value,
  sourceValue,
  disabled,
  onSelect,
  onNoteBlur,
  onCriterionToggle,
}: {
  index: number;
  item: ChecklistItemDef;
  value: ChecklistItemResult | null;
  sourceValue?: string | null;
  disabled: boolean;
  onSelect: (result: ChecklistResultValue) => void;
  onNoteBlur: (note: string) => void;
  onCriterionToggle: (criterionIndex: number) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(value?.note ?? "");
  const showNote = value?.result === "FAIL";

  return (
    <div className="rounded-lg border border-[#efe2d4] p-3.5">
      <p className="text-[12.5px] font-extrabold text-[#20180f]">
        {index}. {item.title}
      </p>
      {item.description && <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#594138]">{item.description}</p>}
      {item.question && (
        <div className="mt-2 rounded-md bg-[#f7f2ec] p-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#a68f80]">Pertanyaan Verifikasi</div>
          <div className="mt-0.5 text-[11.5px] text-[#20180f]">{item.question}</div>
        </div>
      )}
      {item.dataSource && (
        <div className="mt-2 text-[11px] text-[#8a7565]">
          <span className="font-bold text-[#594138]">Sumber data: </span>
          {item.dataSource}
        </div>
      )}
      {sourceValue && (
        <div className="mt-2 rounded-md border border-[#cfe0fb] bg-[#eef4fe] p-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#2f6fd6]">Data pada Sistem</div>
          <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{sourceValue}</div>
        </div>
      )}
      {item.examples && item.examples.length > 0 && (
        <div className="mt-2 text-[11px] text-[#8a7565]">
          <span className="font-bold text-[#594138]">Contoh: </span>
          {item.examples.join(", ")}
        </div>
      )}
      {item.criteria && item.criteria.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#a68f80]">Kriteria Verifikasi</div>
          <div className="mt-1 flex flex-col gap-1">
            {item.criteria.map((c, i) => {
              const checked = value?.criteriaChecked?.[i] ?? false;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onCriterionToggle(i)}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[#f7f2ec] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <MaterialIcon
                    name={checked ? "check_circle" : "cancel"}
                    filled
                    className={`mt-0.25 shrink-0 text-[16px] ${checked ? "text-[#1a9850]" : "text-[#c1361f]"}`}
                  />
                  <span className={`text-[11.5px] leading-relaxed ${checked ? "text-[#1a7a4c]" : "text-[#594138]"}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#a68f80]">Hasil Verifikasi</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {(Object.keys(CHECKLIST_RESULT_STYLE) as ChecklistResultValue[]).map((option) => {
            const style = CHECKLIST_RESULT_STYLE[option];
            const active = value?.result === option;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(option)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={active ? { background: style.bg, borderColor: style.bg, color: "#fff" } : { borderColor: "#e1bfb3", color: "#4a4038" }}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>
      {showNote && (
        <textarea
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          onBlur={() => {
            if (noteDraft !== (value?.note ?? "")) onNoteBlur(noteDraft);
          }}
          disabled={disabled}
          rows={2}
          placeholder="Jelaskan ketidaksesuaian..."
          className="mt-2.5 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2 text-[11.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
        />
      )}
    </div>
  );
}

function CollapsibleCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex cursor-pointer items-center justify-between"
      >
        <div>
          <div className="text-[15.5px] font-extrabold text-[#20180f]">{title}</div>
          <div className="mt-0.75 text-[12.5px] text-[#8a7565]">{desc}</div>
        </div>
        <MaterialIcon name={open ? "expand_less" : "expand_more"} className="text-[22px] text-[#8a7565]" />
      </div>
      {open && <div className="mt-4.5">{children}</div>}
    </div>
  );
}

function ComplianceTable({ rows, onReview }: { rows: DocumentRow[]; onReview: (row: DocumentRow) => void }) {
  return (
    <div className="overflow-auto rounded-lg border border-[#e8dccd]">
      <table className="w-full min-w-[900px] border-collapse text-[11.5px]">
        <thead>
          <tr style={{ background: "#e0662e" }}>
            {["No", "Jenis Dokumen", "Persyaratan", "Referensi Regulasi", "Keterangan", "Status Dokumen", "Status Review", "Action"].map(
              (h) => (
                <th key={h} className="border border-[#c14a1f] px-2.5 py-2.25 text-left text-[11px] font-bold text-white">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const def = getComplianceDef(row.key);
            const docStatus = docStatusLabel(row);
            return (
              <tr key={row.key}>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top text-[#6b5b4c]">{index + 1}</td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top font-bold text-[#20180f]">{row.label}</td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top">
                  <span
                    className="whitespace-nowrap rounded-full px-2 py-0.75 text-[10.5px] font-bold"
                    style={
                      def?.persyaratan.startsWith("Wajib")
                        ? { background: "#fbe4de", color: "#c1361f" }
                        : { background: "#f2ece5", color: "#8a7565" }
                    }
                  >
                    {def?.persyaratan ?? "—"}
                  </span>
                </td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top text-[#4a4038]">{def?.referensi ?? "—"}</td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top text-[#4a4038]">{def?.keterangan ?? "—"}</td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top">
                  <span
                    className="whitespace-nowrap rounded-full px-2 py-0.75 text-[10.5px] font-bold"
                    style={{ background: docStatus.bg, color: docStatus.color }}
                  >
                    {docStatus.label}
                  </span>
                </td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.75 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[row.status]}`}
                  >
                    {reviewStatusLabel(row)}
                  </span>
                </td>
                <td className="border border-[#efe2d4] px-2.5 py-2.25 align-top">
                  <button
                    type="button"
                    onClick={() => onReview(row)}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813]"
                  >
                    <MaterialIcon name="visibility" className="text-[14px]" />
                    Review
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VersionHistoryModal({
  assignmentId,
  docKey,
  docTitle,
  entityName,
  canEdit,
  onClose,
  onSelectVersion,
  onUploaded,
}: {
  assignmentId: string;
  docKey: string;
  docTitle: string;
  entityName: string;
  canEdit: boolean;
  onClose: () => void;
  onSelectVersion: (path: string, version: number) => void;
  onUploaded: () => void;
}) {
  const documentCode = checklistItemCode(docKey, docTitle);
  const historyQueryKey = ["verifikator-workspace", "assignments", assignmentId, "documents", docKey, "history"];
  const { data, isLoading, refetch } = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents/${encodeURIComponent(docKey)}/history`);
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

      const saveRes = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents/${encodeURIComponent(docKey)}/history`, {
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

        {canEdit && (
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
        )}

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 pb-3">
          {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
          {!isLoading && versions.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada riwayat dokumen.</p>}
          {versions.map((v) => {
            const fileName = buildDisplayFileName(documentCode, entityName, v.version, v.path);
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
                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(v.path, v.version);
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

function ReviewModal({
  assignmentId,
  row,
  companyName,
  payload,
  businessAddress,
  companySkt,
  canEdit,
  isSaving,
  onClose,
  onDecide,
  onSaved,
}: {
  assignmentId: string;
  row: DocumentRow;
  companyName: string;
  payload: ApplicationWizardValues;
  businessAddress: string | null;
  companySkt: CompanySkt;
  canEdit: boolean;
  isSaving: boolean;
  onClose: () => void;
  onDecide: (status: DocVerificationStatusValue, note: string) => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(row.note);
  const [collapsed, setCollapsed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState(row.documentPath);
  const [previewVersion, setPreviewVersion] = useState(row.version);
  const [checklistResult, setChecklistResult] = useState<Record<string, ChecklistItemResult>>(row.checklistResult ?? {});
  const href = previewPath ? fileHref(previewPath) : null;
  const docStatus = docStatusLabel(row);
  const checklistItems = useMemo(() => getChecklistItems(row.key), [row.key]);
  const documentCode = checklistItemCode(row.key, row.label);
  const displayName = previewPath ? buildDisplayFileName(documentCode, companyName, previewVersion, previewPath) : null;

  async function saveChecklistPatch(itemId: string, patch: Partial<ChecklistItemResult>) {
    const previous = checklistResult;
    const currentItem = checklistResult[itemId] ?? { result: null, note: null, criteriaChecked: [] };
    setChecklistResult((prev) => ({ ...prev, [itemId]: { ...currentItem, ...patch } }));
    const response = await fetch(
      `/api/verifikator-workspace/assignments/${assignmentId}/documents/${encodeURIComponent(row.key)}/checklist`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ...patch }),
      },
    );
    if (!response.ok) {
      setChecklistResult(previous);
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan checklist");
      return;
    }
    onSaved();
  }

  function handleChecklistSelect(itemId: string, result: ChecklistResultValue) {
    const currentNote = checklistResult[itemId]?.note ?? null;
    saveChecklistPatch(itemId, { result, note: result === "FAIL" ? currentNote : null });
  }

  function handleChecklistNoteBlur(itemId: string, note: string) {
    if (!checklistResult[itemId]) return;
    saveChecklistPatch(itemId, { note: note.trim() || null });
  }

  function handleCriterionToggle(itemId: string, criterionIndex: number) {
    const current = checklistResult[itemId]?.criteriaChecked ?? [];
    const updated = [...current];
    updated[criterionIndex] = !updated[criterionIndex];
    saveChecklistPatch(itemId, { criteriaChecked: updated });
  }

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

  const format = previewPath ? (previewPath.split(".").pop() ?? "").toUpperCase() : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">{row.label}</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{row.category}</div>
          </div>
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
          <div
            className={`flex shrink-0 flex-col gap-3 overflow-y-auto transition-[width] duration-200 ${collapsed ? "w-[480px]" : "w-[260px]"}`}
          >
            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="text-[13px] font-extrabold text-[#20180f]">Uraian yang Diperiksa</div>
              <div className="mt-0.5 text-[11px] text-[#8a7565]">Poin pemeriksaan untuk {row.label}</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {checklistItems.map((item, i) => (
                  <ChecklistItemRow
                    key={item.id}
                    index={i + 1}
                    item={item}
                    value={checklistResult[item.id] ?? null}
                    sourceValue={item.getValue?.({ payload, businessAddress, companySkt })}
                    disabled={!canEdit}
                    onSelect={(value) => handleChecklistSelect(item.id, value)}
                    onNoteBlur={(note) => handleChecklistNoteBlur(item.id, note)}
                    onCriterionToggle={(criterionIndex) => handleCriterionToggle(item.id, criterionIndex)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-3 text-[12.5px] font-bold text-[#20180f]">Catatan Verifikasi</div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Catatan verifikasi (opsional)..."
                disabled={!canEdit}
                className="mb-3 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
              />
              {canEdit && (
                <div className="flex flex-col gap-2">
                  {DOC_VERIFICATION_STATUSES.filter((s) => s !== "PENDING").map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDecide(status, note)}
                      className={
                        "rounded-lg border px-3 py-2 text-[12.5px] font-bold disabled:opacity-50 " +
                        (row.status === status
                          ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]"
                          : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                      }
                    >
                      {DOC_VERIFICATION_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
              {row.verifiedAt && (
                <div className="mt-3 text-[10.5px] text-[#8a7565]">
                  Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-lg bg-[#2c2f36]">
            {!href && (
              <p className="p-8 text-center text-[13px] text-[#a68f80]">Dokumen belum diunggah oleh perusahaan.</p>
            )}
            {href && isImagePath(previewPath!) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={href} alt={row.label} className="mx-auto max-h-[68vh] w-auto" />
            )}
            {href && !isImagePath(previewPath!) && (
              <iframe src={href} title={row.label} className="h-[68vh] w-full border-0" />
            )}
          </div>
          <div
            className={`flex shrink-0 flex-col gap-3 overflow-y-auto transition-[width] duration-200 ${collapsed ? "w-13" : "w-[280px]"}`}
          >
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
                {collapsed ? (
                  <MaterialIcon name="chevron_right" className="mx-auto text-[18px] text-[#4a5a70]" />
                ) : (
                  <MaterialIcon name="chevron_left" className="text-[18px] text-[#4a5a70]" />
                )}
              </button>
              <div className={`flex flex-col gap-3 ${collapsed ? "px-1.5 py-3" : "p-3.5"}`}>
                <InfoRow icon="description" label="Document Name" collapsed={collapsed}>
                  {displayName ?? "—"}
                </InfoRow>
                <InfoRow icon="info" label="Document Type" collapsed={collapsed}>
                  {row.label}
                </InfoRow>
                <InfoRow icon="folder" label="Category" collapsed={collapsed}>
                  {row.category}
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
                <InfoRow icon="fact_check" label="Status Review" collapsed={collapsed}>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[row.status]}`}>
                    {reviewStatusLabel(row)}
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
                        v{row.version}
                      </button>
                    </InfoRow>
                  )}
                </div>
                <InfoRow icon="person" label="Uploaded By" collapsed={collapsed}>
                  {row.uploadedByName ?? (row.documentPath ? "Company" : "—")}
                </InfoRow>
                <InfoRow icon="calendar_month" label="Upload Date" collapsed={collapsed}>
                  {fmtDate(row.uploadedAt)}
                </InfoRow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          assignmentId={assignmentId}
          docKey={row.key}
          docTitle={row.label}
          entityName={companyName}
          canEdit={canEdit}
          onClose={() => setShowVersionHistory(false)}
          onSelectVersion={(path, version) => {
            setPreviewPath(path);
            setPreviewVersion(version);
          }}
          onUploaded={onSaved}
        />
      )}
    </div>
  );
}

type CompanySkt = { sktNumber: string | null; sktIssuer: string | null; sktDate: string | null };

type Props = {
  assignmentId: string;
  assignmentStatus: AssignmentStatusValue;
  verificationType: string;
  companyName: string;
  payload: ApplicationWizardValues;
  businessAddress: string | null;
  companySkt: CompanySkt;
};

export function DocumentVerificationTab({
  assignmentId,
  assignmentStatus,
  verificationType,
  companyName,
  payload,
  businessAddress,
  companySkt,
}: Props) {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [reviewingRow, setReviewingRow] = useState<DocumentRow | null>(null);
  const [docView, setDocView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const canEdit = assignmentStatus === "SUBMITTED";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "documents"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents`);
      if (!response.ok) throw new Error("Gagal memuat daftar dokumen");
      const json = (await response.json()) as { data: DocumentRow[] };
      return json.data;
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter((r) => r.status === "VALID").length;
    const missing = rows.filter((r) => !r.documentPath).length;
    const pendingReview = rows.filter((r) => r.documentPath && r.status === "PENDING").length;
    const reviewed = rows.filter((r) => r.status !== "PENDING").length;
    return { total, valid, missing, pendingReview, reviewed };
  }, [rows]);
  const progressPct = stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0;

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.label.toLowerCase().includes(q)) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [rows, search, categoryFilter, statusFilter]);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  async function handleDecision(row: DocumentRow, status: DocVerificationStatusValue, note: string) {
    setSavingKey(row.key);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: row.key, status, note }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status dokumen");
      return;
    }
    toast.success(`${row.label} ditandai ${DOC_VERIFICATION_STATUS_LABELS[status]}.`);
    invalidateAll();
    setReviewingRow(null);
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat daftar dokumen...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6">
        <div className="mb-1 text-[15.5px] font-extrabold text-[#20180f]">Document Summary</div>
        <div className="mb-4 text-[13px] text-[#8a7565]">Ringkasan status dokumen yang diunggah oleh perusahaan</div>
        <div className="mb-5.5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {[
            { label: "Total Dokumen", value: stats.total, icon: "description", color: "#2f6fe0", iconBg: "#e6effa" },
            { label: "Valid", value: stats.valid, icon: "check_circle", color: "#1a9850", iconBg: "#e2f7ea" },
            { label: "Pending Review", value: stats.pendingReview, icon: "schedule", color: "#c9820f", iconBg: "#fdf0d5" },
            { label: "Missing", value: stats.missing, icon: "error", color: "#dc2626", iconBg: "#fbe4de" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-[10px] border border-[#efe2d4] p-3.5">
              <div
                className="flex size-9.5 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: stat.iconBg }}
              >
                <MaterialIcon name={stat.icon} className="text-[19px]" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-[20px] font-extrabold text-[#20180f]">{stat.value}</div>
                <div className="text-[11.5px] text-[#8a7565]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13.5px] font-bold text-[#20180f]">Document Verification Progress</div>
          <div className="text-[13px] font-bold text-[#2f6fe0]">
            {stats.reviewed} / {stats.total} Documents Reviewed
          </div>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e8e2da]">
          <div className="h-full rounded-full bg-[#20180f]" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[12px] text-[#6b5b4c]">
          {progressPct}% complete — {stats.total - stats.reviewed} dokumen belum direview
        </div>
      </div>

      {COMPLIANCE_SECTION_DEFS.filter((def) => !def.vkiOnly || verificationType === "VKI").map((def) => {
        const sectionRows = rows.filter((row) => row.category === def.category);
        return (
          <CollapsibleCard key={def.category} title={def.title} desc={def.desc}>
            <div className="mb-4.5 flex flex-col gap-3 text-[12.5px] leading-relaxed text-[#4a4038]">
              {def.intro.map((p, i) => (
                <p key={i} className="m-0">
                  {p}
                </p>
              ))}
            </div>
            <ComplianceTable rows={sectionRows} onReview={setReviewingRow} />
          </CollapsibleCard>
        );
      })}

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[15.5px] font-extrabold text-[#20180f]">Document List</div>
            <div className="mt-0.5 text-[13px] text-[#8a7565]">Tabel daftar dokumen yang diunggah oleh perusahaan</div>
          </div>
          <div className="flex gap-1 rounded-lg bg-[#f0ede8] p-1">
            <button
              type="button"
              onClick={() => setDocView("table")}
              className={
                "flex items-center gap-1.5 rounded-md px-3.5 py-1.75 text-[12px] font-bold " +
                (docView === "table" ? "bg-[#20180f] text-white" : "text-[#4a4038]")
              }
            >
              <MaterialIcon name="list" className="text-[16px]" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setDocView("card")}
              className={
                "flex items-center gap-1.5 rounded-md px-3.5 py-1.75 text-[12px] font-bold " +
                (docView === "card" ? "bg-[#20180f] text-white" : "text-[#4a4038]")
              }
            >
              <MaterialIcon name="grid_view" className="text-[16px]" />
              Card
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-[10px] bg-[#f7f2ec] p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#20180f]">
            <MaterialIcon name="filter_alt" className="text-[17px]" />
            Filters
          </div>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
              <MaterialIcon name="search" className="text-[16px] text-[#a68f80]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents..."
                className="flex-1 border-none bg-transparent text-[12.5px] outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-lg bg-white px-3 py-2 text-[12.5px] text-[#20180f] outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg bg-white px-3 py-2 text-[12.5px] text-[#20180f] outline-none"
            >
              <option value="">All Review Status</option>
              {DOC_VERIFICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DOC_VERIFICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[12px] text-[#8a7565]">
            Showing {filteredRows.length} of {rows.length} documents
          </div>
        </div>

        {docView === "table" ? (
          <div className="overflow-auto">
            <div className="grid grid-cols-[0.4fr_1.5fr_1.4fr_1fr_1fr_1.2fr_0.8fr] gap-2 px-1 pb-2.5 text-[11.5px] font-bold text-[#8a7565]">
              <div>No</div>
              <div>Dokumen</div>
              <div>Kategori</div>
              <div>Tanggal Upload</div>
              <div>Status Dokumen</div>
              <div>Status Review</div>
              <div>Action</div>
            </div>
            {filteredRows.map((row, index) => {
              const docStatus = docStatusLabel(row);
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[0.4fr_1.5fr_1.4fr_1fr_1fr_1.2fr_0.8fr] items-center gap-2 border-t border-[#f5ebe1] px-1 py-3 text-[13px]"
                >
                  <div className="text-[#6b5b4c]">{index + 1}</div>
                  <div className="font-bold text-[#20180f]">{row.label}</div>
                  <div className="text-[#c14a1f]">{row.category}</div>
                  <div className="text-[#4a4038]">{fmtDate(row.uploadedAt)}</div>
                  <div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: docStatus.bg, color: docStatus.color }}
                    >
                      {docStatus.label}
                    </span>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[row.status]}`}>
                      {reviewStatusLabel(row)}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setReviewingRow(row)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="visibility" className="text-[15px]" />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((row) => {
              const docStatus = docStatusLabel(row);
              return (
                <div key={row.key} className="flex flex-col rounded-[10px] border border-[#efe2d4] p-4.5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#e6effa]">
                      <MaterialIcon name="description" className="text-[19px] text-[#2f6fe0]" />
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                      style={{ background: docStatus.bg, color: docStatus.color }}
                    >
                      {docStatus.label}
                    </span>
                  </div>
                  <div className="text-[13.5px] font-bold text-[#20180f]">{row.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-[#c14a1f]">{row.category}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[row.status]}`}>
                      {reviewStatusLabel(row)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReviewingRow(row)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="visibility" className="text-[15px]" />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewingRow && (
        <ReviewModal
          key={reviewingRow.key}
          assignmentId={assignmentId}
          row={reviewingRow}
          companyName={companyName}
          payload={payload}
          businessAddress={businessAddress}
          companySkt={companySkt}
          canEdit={canEdit}
          isSaving={savingKey === reviewingRow.key}
          onClose={() => setReviewingRow(null)}
          onDecide={(status, note) => handleDecision(reviewingRow, status, note)}
          onSaved={invalidateAll}
        />
      )}
    </div>
  );
}
