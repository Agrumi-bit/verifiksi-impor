"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { SectionShell } from "./section-shell";
import type { DocCheckValues } from "./schema";

type Props = {
  docs: DocCheckValues[];
  onChange: (key: string, patch: Partial<DocCheckValues>) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function Section1Documents({ docs, onChange, onSave, onSaveNext, isSaving }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(docs[0]?.key ?? null);

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
                  <textarea
                    value={doc.addressText ?? ""}
                    onChange={(e) => onChange(doc.key, { addressText: e.target.value })}
                    placeholder={`isikan alamat kantor pada ${doc.name}`}
                    className="mb-4 min-h-[56px] w-full resize-y rounded-[10px] border border-[#e4e8ee] bg-[#f6f7f9] p-3 text-[13.5px]"
                  />
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
                      <button
                        type="button"
                        onClick={() => toast.info("Pratinjau dokumen akan tersedia di iterasi berikutnya.")}
                        className="rounded-[9px] border border-[#d7dbe0] bg-white px-4 py-2 text-[13px] font-bold text-[#1c2530]"
                      >
                        View Document
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(doc.key, { status: "rejected" })}
                        className="rounded-[9px] bg-[#dc2626] px-4 py-2 text-[13px] font-bold text-white"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(doc.key, { status: "approved" })}
                        className="rounded-[9px] bg-[#16a34a] px-4 py-2 text-[13px] font-bold text-white"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
