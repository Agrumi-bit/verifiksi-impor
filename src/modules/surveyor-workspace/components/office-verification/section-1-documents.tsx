"use client";

import { useState } from "react";

import { MaterialIcon } from "../material-icon";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { composeLocationAddress } from "@/modules/shared/schema";
import { SectionShell } from "./section-shell";
import type { DocCheckValues } from "./schema";

type PayloadLocation = {
  address?: string | null;
  addressDesa?: string | null;
  addressKecamatan?: string | null;
  city?: string | null;
  province?: string | null;
};

type DocumentMetaEntry = {
  version: number;
  uploadedByName: string | null;
  uploadedAt: string | null;
  verificationStatus: string;
};

type Props = {
  docs: DocCheckValues[];
  payloadLocation: PayloadLocation | null;
  documentMeta: Record<string, DocumentMetaEntry | null>;
  onChange: (key: string, patch: Partial<DocCheckValues>) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function Section1Documents({ docs, payloadLocation, documentMeta, onChange, onSave, onSaveNext, isSaving }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(docs[0]?.key ?? null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

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
    <SectionShell
      index={1}
      title="Kesesuaian Lokasi Berdasarkan Dokumen Resmi"
      onSave={onSave}
      onSaveNext={onSaveNext}
      isSaving={isSaving}
    >
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
        Tujuan section ini adalah mencocokkan alamat kantor yang dikunjungi dengan alamat pada dokumen legal
        perusahaan.
      </p>
      <div className="mb-3 text-sm font-extrabold text-[#1c2530]">Dokumen yang diperiksa:</div>

      {docs.length === 0 && (
        <p className="mb-5 text-[13px] text-[#8a96a8]">
          Tidak ada dokumen resmi yang terhubung dengan lokasi ini.
        </p>
      )}

      <div className="mb-5 flex flex-col gap-3">
        {docs.map((doc) => {
          const expanded = expandedKey === doc.key;
          const cardBg = doc.status === "approved" ? "#4bb679" : doc.status === "rejected" ? "#fdecec" : "#fff";
          const cardBorder = doc.status === "approved" ? "#4bb679" : doc.status === "rejected" ? "#f3b8b8" : "#dbe4f0";
          const textColor = doc.status === "approved" ? "#fff" : "#1c2530";
          const iconColor = doc.status === "approved" ? "#fff" : "#f26522";
          return (
            <div
              key={doc.key}
              className="rounded-xl p-5"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[14.5px] font-bold" style={{ color: textColor }}>
                  {doc.name}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedKey(expanded ? null : doc.key)}
                  aria-label="Toggle"
                >
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

      {previewDoc?.documentPath && (
        <DocumentPreviewModal
          documentPath={previewDoc.documentPath}
          label={previewDoc.name}
          onClose={() => setPreviewKey(null)}
          locationCheck={{
            systemAddress,
            actualAddress: previewDoc.addressText ?? "",
            onActualAddressChange: (value) => onChange(previewDoc.key, { addressText: value }),
            status: previewDoc.status,
            onApprove: () => onChange(previewDoc.key, { status: "approved" }),
            onReject: () => onChange(previewDoc.key, { status: "rejected" }),
          }}
          documentInfo={
            documentMeta[previewDoc.key]
              ? {
                  documentType: previewDoc.name,
                  version: documentMeta[previewDoc.key]!.version,
                  uploadedByName: documentMeta[previewDoc.key]!.uploadedByName,
                  uploadedAt: documentMeta[previewDoc.key]!.uploadedAt,
                  verificationStatus: documentMeta[previewDoc.key]!.verificationStatus,
                }
              : undefined
          }
        />
      )}
    </SectionShell>
  );
}
