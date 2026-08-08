"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, HelpCircle, History, XCircle } from "lucide-react";

import { DocumentPreview } from "@/modules/applications/components/document-preview";
import {
  CR_DOCUMENT_STATUS_LABELS,
  DOC_VERIFICATION_STATUS_BADGE,
  type CrDocumentCheckStatus,
  type DocVerificationStatusValue,
} from "../../status";
import { RequestDocumentModal } from "./request-document-modal";
import { DocumentHistoryModal } from "./document-history-modal";

type DocItem = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  lengkap: boolean;
  status: DocVerificationStatusValue;
  rejectionNote: string;
  requestNote: string;
};

type Props = {
  applicationId: string;
  company: string;
  documents: DocItem[];
  docsSummary: string;
  showMarkAcceptedButton: boolean;
  onMarkAccepted: () => void;
  onChanged: () => void;
};

const CHECK_BUTTONS: { status: CrDocumentCheckStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: "VALID", label: "Dokumen Benar", icon: CheckCircle2 },
  { status: "REJECTED", label: "Dokumen Salah", icon: XCircle },
  { status: "NOT_APPLICABLE", label: "Dokumen Tidak Diperlukan", icon: HelpCircle },
];

export function DocumentsTab({ applicationId, company, documents, docsSummary, showMarkAcceptedButton, onMarkAccepted, onChanged }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [requestModalDoc, setRequestModalDoc] = useState<DocItem | null>(null);
  const [historyDoc, setHistoryDoc] = useState<DocItem | null>(null);

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

  return (
    <div className="rounded-xl border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-1 flex items-start justify-between">
        <div className="text-[15px] font-extrabold text-[#20180f]">Kelengkapan Dokumen</div>
        {showMarkAcceptedButton && (
          <button
            type="button"
            onClick={onMarkAccepted}
            className="rounded-lg bg-[#1f8a4c] px-3.5 py-1.75 text-[12px] font-bold text-white"
          >
            Tandai Permohonan Diterima
          </button>
        )}
      </div>
      <p className="mb-3.5 text-[12.5px] text-[#8a7565]">{docsSummary}. Minta dokumen tambahan untuk item yang masih kurang.</p>

      <div className="flex flex-col gap-2.5">
        {documents.map((doc) => {
          const expanded = doc.lengkap && expandedKey === doc.key;
          return (
            <div key={doc.key} className="overflow-hidden rounded-[9px] border border-[#efe2d4]">
              <div
                onClick={() => doc.lengkap && setExpandedKey((cur) => (cur === doc.key ? null : doc.key))}
                className="flex items-center justify-between px-3.5 py-3"
                style={{ cursor: doc.lengkap ? "pointer" : "default" }}
              >
                <div className="flex items-center gap-2.5">
                  {doc.lengkap ? (
                    <CheckCircle2 className="size-4.5 text-[#1f8a4c]" />
                  ) : (
                    <XCircle className="size-4.5 text-[#c1361f]" />
                  )}
                  <div>
                    <div className="text-[13px] font-bold text-[#20180f]">{doc.label}</div>
                    {doc.requestNote && (
                      <div className="mt-0.5 text-[11px] text-[#c14a1f]">Diminta: {doc.requestNote}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {doc.lengkap ? (
                    <>
                      <span className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold" style={{ background: "#e5f6ec", color: "#1f8a4c" }}>
                        Tersedia
                      </span>
                      <span className={`whitespace-nowrap rounded-full px-2.25 py-0.75 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[doc.status]}`}>
                        {CR_DOCUMENT_STATUS_LABELS[doc.status]}
                      </span>
                      {expanded ? <ChevronUp className="size-4.5 text-[#a68f80]" /> : <ChevronDown className="size-4.5 text-[#a68f80]" />}
                    </>
                  ) : doc.status === "NOT_APPLICABLE" ? (
                    <span className={`whitespace-nowrap rounded-full px-2.25 py-0.75 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE.NOT_APPLICABLE}`}>
                      Tidak Diperlukan
                    </span>
                  ) : (
                    <>
                      <span className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold" style={{ background: "#fbe4de", color: "#c1361f" }}>
                        Kurang
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestModalDoc(doc);
                        }}
                        className="whitespace-nowrap rounded-lg border border-[#e8b89a] bg-[#fdeadd] px-3 py-1.75 text-[12px] font-bold text-[#c14a1f]"
                      >
                        Minta Dokumen
                      </button>
                      <button
                        type="button"
                        disabled={savingKey === doc.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          callAction(doc.key, { action: "check", status: "NOT_APPLICABLE" });
                        }}
                        className="whitespace-nowrap rounded-lg border border-[#e0d3e8] bg-[#f3edf9] px-3 py-1.75 text-[12px] font-bold text-[#6d28d9] disabled:opacity-60"
                      >
                        Tidak Diperlukan
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="border-t border-[#f5ebe1] p-4.5">
                  <div className="grid gap-5 sm:grid-cols-[1fr_1.3fr]">
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Nama Dokumen</div>
                        <div className="rounded-lg bg-[#f7f2ec] p-2.75 text-[13px] font-semibold text-[#20180f]">{doc.label}</div>
                      </div>
                      <div>
                        <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Kategori</div>
                        <div className="rounded-lg bg-[#f7f2ec] p-2.75 text-[13px] font-semibold text-[#20180f]">{doc.category}</div>
                      </div>
                    </div>
                    <DocumentPreview path={doc.documentPath ?? undefined} label={doc.label} />
                  </div>

                  <div className="mt-4 border-t border-dashed border-[#e8dccd] pt-4">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="text-[12.5px] font-bold text-[#20180f]">Verifikasi Dokumen</div>
                      <button
                        type="button"
                        onClick={() => setHistoryDoc(doc)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3 py-1.5 text-[11.5px] font-semibold text-[#261813]"
                      >
                        <History className="size-3.5" />
                        Riwayat &amp; Upload Dokumen
                      </button>
                    </div>
                    <textarea
                      value={notes[doc.key] ?? doc.rejectionNote}
                      onChange={(e) => setNotes((cur) => ({ ...cur, [doc.key]: e.target.value }))}
                      rows={2}
                      placeholder="Catatan (opsional) — mis. alasan dokumen salah..."
                      className="mb-2.5 w-full resize-y rounded-lg border border-[#e8dccd] bg-white p-2.5 font-sans text-[12.5px] text-[#20180f] outline-none"
                    />
                    <div className="flex flex-wrap gap-2.5">
                      {CHECK_BUTTONS.map(({ status, label, icon: Icon }) => {
                        const active = doc.status === status;
                        const color = status === "VALID" ? "#1f8a4c" : status === "REJECTED" ? "#c1361f" : "#6d28d9";
                        const bg = status === "VALID" ? "#e9f6ee" : status === "REJECTED" ? "#fbe4de" : "#ede9fe";
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={savingKey === doc.key}
                            onClick={() => callAction(doc.key, { action: "check", status, note: notes[doc.key] ?? doc.rejectionNote })}
                            className="flex items-center gap-1.5 rounded-lg border-[1.5px] px-4 py-2 text-[12.5px] font-bold disabled:opacity-60"
                            style={{
                              background: active ? color : "#fff",
                              borderColor: active ? color : bg,
                              color: active ? "#fff" : color,
                            }}
                          >
                            <Icon className="size-4" />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {doc.status === "VALID" && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#1f8a4c]">
                        <CheckCircle2 className="size-4" />
                        Dokumen ditandai valid oleh Customer Relation.
                      </div>
                    )}
                    {doc.status === "REJECTED" && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#c1361f]">
                        <XCircle className="size-4" />
                        Dokumen ditandai tidak valid dan dikembalikan ke perusahaan untuk diunggah ulang.
                      </div>
                    )}
                    {doc.status === "NOT_APPLICABLE" && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#6d28d9]">
                        <HelpCircle className="size-4" />
                        Dokumen ditandai tidak diperlukan.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
