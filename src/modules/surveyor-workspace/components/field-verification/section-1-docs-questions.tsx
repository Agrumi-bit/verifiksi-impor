"use client";

import { useState } from "react";

import { MaterialIcon } from "../material-icon";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { composeLocationAddress } from "@/modules/shared/schema";
import { SectionShell } from "../office-verification/section-shell";
import { QuestionList } from "../office-verification/question-list";
import { SECTION1_QUESTIONS, LOCATION_LABEL, type FieldKind, type AnswerValues, type DocCheckValues } from "./schema";

type PayloadLocation = {
  address?: string | null;
  addressDesa?: string | null;
  addressKecamatan?: string | null;
  city?: string | null;
  province?: string | null;
};

type Props = {
  kind: FieldKind;
  docs: DocCheckValues[];
  payloadLocation: PayloadLocation | null;
  answers: Record<string, AnswerValues>;
  onDocChange: (key: string, patch: Partial<DocCheckValues>) => void;
  onAnswer: (key: string, value: AnswerValues) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function Section1DocsQuestions({
  kind,
  docs,
  payloadLocation,
  answers,
  onDocChange,
  onAnswer,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(docs[0]?.key ?? null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const label = LOCATION_LABEL[kind].toLowerCase();

  const systemAddress = payloadLocation
    ? [
        composeLocationAddress({
          address: payloadLocation.address ?? undefined,
          addressDesa: payloadLocation.addressDesa ?? undefined,
          addressKecamatan: payloadLocation.addressKecamatan ?? undefined,
        }),
        payloadLocation.city,
        payloadLocation.province,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const previewDoc = docs.find((d) => d.key === previewKey) ?? null;

  return (
    <SectionShell index={1} title={`Kesesuaian Lokasi ${LOCATION_LABEL[kind]} Berdasarkan Dokumen`} onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Verifikasi dilakukan untuk memastikan bahwa alamat {label} yang dikunjungi sesuai dengan alamat yang
        tercantum pada dokumen kepemilikan atau penggunaan {label} serta dokumen legalitas {label}.
      </p>
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
        Surveyor melakukan pencocokan alamat {label} dengan dokumen yang tersedia.
      </p>
      <div className="mb-3 text-sm font-extrabold text-[#1c2530]">Dokumen yang diperiksa:</div>

      {docs.length === 0 && (
        <p className="mb-5 text-[13px] text-[#8a96a8]">Tidak ada dokumen resmi yang terhubung dengan lokasi ini.</p>
      )}

      <div className="mb-5 flex flex-col gap-3">
        {docs.map((doc) => {
          const expanded = expandedKey === doc.key;
          const cardBg = doc.status === "approved" ? "#4bb679" : doc.status === "rejected" ? "#fdecec" : "#fff";
          const cardBorder = doc.status === "approved" ? "#4bb679" : doc.status === "rejected" ? "#f3b8b8" : "#dbe4f0";
          const textColor = doc.status === "approved" ? "#fff" : "#1c2530";
          const iconColor = doc.status === "approved" ? "#fff" : "#f26522";
          return (
            <div key={doc.key} className="rounded-xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="flex items-center justify-between">
                <div className="text-[14.5px] font-bold" style={{ color: textColor }}>
                  {doc.name}
                </div>
                <button type="button" onClick={() => setExpandedKey(expanded ? null : doc.key)} aria-label="Toggle">
                  <MaterialIcon
                    name={expanded ? "remove_circle" : "add_circle"}
                    className="cursor-pointer text-[22px]"
                    style={{ color: iconColor }}
                  />
                </button>
              </div>
              {expanded && (
                <div className="mt-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="mb-0.5 text-sm font-bold" style={{ color: textColor }}>
                        Actions
                      </div>
                      <div className="text-[12.5px]" style={{ color: doc.status === "approved" ? "#e9fbf0" : "#8a96a8" }}>
                        Tindakan terhadap verifikasi lokasi sesuai pada dokumen
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {doc.documentPath && (
                        <button
                          type="button"
                          onClick={() => setPreviewKey(doc.key)}
                          className="rounded-[9px] border border-[#d7dbe0] bg-white px-4 py-2 text-[13px] font-bold text-[#1c2530]"
                        >
                          Lihat Dokumen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-3.5 text-sm font-extrabold text-[#1c2530]">Pertanyaan Verifikasi</div>
      <QuestionList questions={SECTION1_QUESTIONS[kind]} answers={answers} onAnswer={onAnswer} />

      {previewDoc?.documentPath && (
        <DocumentPreviewModal
          documentPath={previewDoc.documentPath}
          label={previewDoc.name}
          onClose={() => setPreviewKey(null)}
          locationCheck={{
            systemAddress,
            actualAddress: previewDoc.addressText ?? "",
            onActualAddressChange: (value) => onDocChange(previewDoc.key, { addressText: value }),
            status: previewDoc.status,
            onApprove: () => onDocChange(previewDoc.key, { status: "approved" }),
            onReject: () => onDocChange(previewDoc.key, { status: "rejected" }),
          }}
        />
      )}
    </SectionShell>
  );
}
