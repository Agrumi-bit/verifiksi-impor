"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Eye, FileText, Filter, HelpCircle, LayoutGrid, List, Search, XCircle } from "lucide-react";

import { COMPLIANCE_SECTION_DEFS } from "@/modules/verifikator-workspace/document-compliance-defs";
import { CollapsibleCard, ComplianceTable, docStatusLabel } from "@/modules/verifikator-workspace/components/detail/document-verification-tab";
import {
  CR_DOCUMENT_CHECK_STATUSES,
  CR_DOCUMENT_STATUS_LABELS,
  DOC_VERIFICATION_STATUS_BADGE,
  type CrDocumentCheckStatus,
  type DocVerificationStatusValue,
} from "../../status";
import { RequestDocumentModal } from "./request-document-modal";
import { DocumentHistoryModal } from "./document-history-modal";
import { DocumentReviewModal, type DocItem } from "./document-review-modal";

type Props = {
  applicationId: string;
  company: string;
  verificationType: string;
  documents: DocItem[];
  showMarkAcceptedButton: boolean;
  onMarkAccepted: () => void;
  onChanged: () => void;
};

const FILTER_STATUSES: DocVerificationStatusValue[] = ["PENDING", ...CR_DOCUMENT_CHECK_STATUSES];

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function reviewLabel(doc: DocItem): string {
  return doc.status === "PENDING" && !doc.lengkap ? "Belum Ada" : CR_DOCUMENT_STATUS_LABELS[doc.status];
}

/**
 * Customer Relation's "Kelengkapan Dokumen" — same format as verifikator-workspace's "Verifikasi
 * Dokumen" (Document Summary stat header, category-grouped compliance-section cards, a searchable/
 * filterable Document List with table/card views, and a review modal), reusing that module's
 * `COMPLIANCE_SECTION_DEFS`/`CollapsibleCard`/`ComplianceTable`/`docStatusLabel` directly. The one
 * real difference: CR only judges a document benar/salah/tidak diperlukan (`CrDocumentCheckStatus`,
 * `CR_DOCUMENT_STATUS_LABELS`) as an administrative completeness check, not a full verification —
 * see `DocumentReviewModal` for the narrower decision UI (no "Uraian yang Diperiksa" checklist).
 */
export function DocumentsTab({ applicationId, company, verificationType, documents, showMarkAcceptedButton, onMarkAccepted, onChanged }: Props) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<DocItem | null>(null);
  const [requestModalDoc, setRequestModalDoc] = useState<DocItem | null>(null);
  const [historyDoc, setHistoryDoc] = useState<DocItem | null>(null);
  const [docView, setDocView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function callAction(key: string, body: { action: "check"; status: CrDocumentCheckStatus; note?: string } | { action: "request"; note?: string }) {
    setSavingKey(key);
    const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/documents/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingKey(null);
    if (!response.ok) {
      toast.error("Gagal menyimpan verifikasi dokumen");
      return;
    }
    onChanged();
  }

  const stats = useMemo(() => {
    const total = documents.length;
    const benar = documents.filter((d) => d.status === "VALID").length;
    const salah = documents.filter((d) => d.status === "REJECTED").length;
    const tidakDiperlukan = documents.filter((d) => d.status === "NOT_APPLICABLE").length;
    const kurang = documents.filter((d) => !d.lengkap).length;
    const reviewed = documents.filter((d) => d.status !== "PENDING").length;
    return { total, benar, salah, tidakDiperlukan, kurang, reviewed };
  }, [documents]);
  const progressPct = stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0;

  const categories = useMemo(() => Array.from(new Set(documents.map((d) => d.category))), [documents]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (q && !doc.label.toLowerCase().includes(q)) return false;
      if (categoryFilter && doc.category !== categoryFilter) return false;
      if (statusFilter && doc.status !== statusFilter) return false;
      return true;
    });
  }, [documents, search, categoryFilter, statusFilter]);

  function handleDecide(doc: DocItem, status: CrDocumentCheckStatus, note: string) {
    callAction(doc.key, { action: "check", status, note });
    setReviewingDoc(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[15.5px] font-extrabold text-[#20180f]">Kelengkapan Dokumen</div>
            <div className="mt-0.5 text-[13px] text-[#8a7565]">Ringkasan status dokumen yang diunggah oleh perusahaan</div>
          </div>
          {showMarkAcceptedButton && (
            <button
              type="button"
              onClick={onMarkAccepted}
              className="whitespace-nowrap rounded-lg bg-[#1f8a4c] px-3.5 py-1.75 text-[12px] font-bold text-white"
            >
              Tandai Permohonan Diterima
            </button>
          )}
        </div>
        <div className="mb-5.5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total Dokumen", value: stats.total, icon: FileText, color: "#2f6fe0", iconBg: "#e6effa" },
            { label: "Benar", value: stats.benar, icon: CheckCircle2, color: "#1a9850", iconBg: "#e2f7ea" },
            { label: "Salah", value: stats.salah, icon: XCircle, color: "#c1361f", iconBg: "#fbe4de" },
            { label: "Tidak Diperlukan", value: stats.tidakDiperlukan, icon: HelpCircle, color: "#6d28d9", iconBg: "#ede9fe" },
            { label: "Kurang", value: stats.kurang, icon: AlertCircle, color: "#dc2626", iconBg: "#fbe4de" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-[10px] border border-[#efe2d4] p-3.5">
              <div className="flex size-9.5 shrink-0 items-center justify-center rounded-[9px]" style={{ background: stat.iconBg }}>
                <stat.icon className="size-4.75" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-[20px] font-extrabold text-[#20180f]">{stat.value}</div>
                <div className="text-[11.5px] text-[#8a7565]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13.5px] font-bold text-[#20180f]">Progress Pemeriksaan Dokumen</div>
          <div className="text-[13px] font-bold text-[#2f6fe0]">
            {stats.reviewed} / {stats.total} Dokumen Diperiksa
          </div>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e8e2da]">
          <div className="h-full rounded-full bg-[#20180f]" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[12px] text-[#6b5b4c]">
          {progressPct}% selesai — {stats.total - stats.reviewed} dokumen belum diperiksa
        </div>
      </div>

      {COMPLIANCE_SECTION_DEFS.filter(
        (def) => (!def.vkiOnly || verificationType === "VKI") && (!def.viuOnly || verificationType === "VIU"),
      ).map((def) => {
        const sectionDocs = documents.filter((doc) => doc.category === def.category);
        return (
          <CollapsibleCard key={def.category} title={def.title} desc={def.desc}>
            <div className="mb-4.5 flex flex-col gap-3 text-[12.5px] leading-relaxed text-[#4a4038]">
              {def.intro.map((p, i) => (
                <p key={i} className="m-0">
                  {p}
                </p>
              ))}
            </div>
            <ComplianceTable rows={sectionDocs} onReview={setReviewingDoc} statusLabels={CR_DOCUMENT_STATUS_LABELS} />
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
              className={"flex items-center gap-1.5 rounded-md px-3.5 py-1.75 text-[12px] font-bold " + (docView === "table" ? "bg-[#20180f] text-white" : "text-[#4a4038]")}
            >
              <List className="size-4" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setDocView("card")}
              className={"flex items-center gap-1.5 rounded-md px-3.5 py-1.75 text-[12px] font-bold " + (docView === "card" ? "bg-[#20180f] text-white" : "text-[#4a4038]")}
            >
              <LayoutGrid className="size-4" />
              Card
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-[10px] bg-[#f7f2ec] p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#20180f]">
            <Filter className="size-4" />
            Filters
          </div>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
              <Search className="size-4 text-[#a68f80]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari dokumen..."
                className="flex-1 border-none bg-transparent text-[12.5px] outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-lg bg-white px-3 py-2 text-[12.5px] text-[#20180f] outline-none"
            >
              <option value="">Semua Kategori</option>
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
              <option value="">Semua Status</option>
              {FILTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CR_DOCUMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[12px] text-[#8a7565]">
            Menampilkan {filteredDocs.length} dari {documents.length} dokumen
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
              <div>Status Pemeriksaan</div>
              <div>Action</div>
            </div>
            {filteredDocs.map((doc, index) => {
              const docStatus = docStatusLabel(doc);
              return (
                <div key={doc.key} className="grid grid-cols-[0.4fr_1.5fr_1.4fr_1fr_1fr_1.2fr_0.8fr] items-center gap-2 border-t border-[#f5ebe1] px-1 py-3 text-[13px]">
                  <div className="text-[#6b5b4c]">{index + 1}</div>
                  <div className="font-bold text-[#20180f]">{doc.label}</div>
                  <div className="text-[#c14a1f]">{doc.category}</div>
                  <div className="text-[#4a4038]">{fmtDate(doc.uploadedAt)}</div>
                  <div>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: docStatus.bg, color: docStatus.color }}>
                      {docStatus.label}
                    </span>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[doc.status]}`}>{reviewLabel(doc)}</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setReviewingDoc(doc)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                    >
                      <Eye className="size-3.75" />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => {
              const docStatus = docStatusLabel(doc);
              return (
                <div key={doc.key} className="flex flex-col rounded-[10px] border border-[#efe2d4] p-4.5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#e6effa]">
                      <FileText className="size-4.75 text-[#2f6fe0]" />
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: docStatus.bg, color: docStatus.color }}>
                      {docStatus.label}
                    </span>
                  </div>
                  <div className="text-[13.5px] font-bold text-[#20180f]">{doc.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-[#c14a1f]">{doc.category}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[doc.status]}`}>{reviewLabel(doc)}</span>
                    <button
                      type="button"
                      onClick={() => setReviewingDoc(doc)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                    >
                      <Eye className="size-3.75" />
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewingDoc && (
        <DocumentReviewModal
          key={reviewingDoc.key}
          company={company}
          doc={reviewingDoc}
          isSaving={savingKey === reviewingDoc.key}
          onClose={() => setReviewingDoc(null)}
          onDecide={(status, note) => handleDecide(reviewingDoc, status, note)}
          onRequest={() => {
            setRequestModalDoc(reviewingDoc);
            setReviewingDoc(null);
          }}
          onShowHistory={() => setHistoryDoc(reviewingDoc)}
        />
      )}

      {requestModalDoc && (
        <RequestDocumentModal
          label={requestModalDoc.label}
          onClose={() => setRequestModalDoc(null)}
          onSend={async (note) => {
            await callAction(requestModalDoc.key, { action: "request", note });
            setRequestModalDoc(null);
          }}
        />
      )}

      {historyDoc && (
        <DocumentHistoryModal
          applicationId={applicationId}
          docKey={historyDoc.key}
          docTitle={historyDoc.label}
          entityName={company}
          onClose={() => setHistoryDoc(null)}
          onUploaded={() => {
            onChanged();
            setHistoryDoc(null);
          }}
        />
      )}
    </div>
  );
}
