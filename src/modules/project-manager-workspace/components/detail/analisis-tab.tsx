"use client";

import DOMPurify from "dompurify";

import { VKI_MODULE_KEYS, VIU_MODULE_KEYS, TECHNICAL_MODULE_LABELS, TECHNICAL_MODULE_STATUS_BADGE, TECHNICAL_MODULE_STATUS_LABELS } from "@/modules/technical-analyst-workspace/status";
import type { PmApplicationDetail } from "./types";

/** Renders rich-text HTML written by a technical analyst via RichTextEditor — sanitized before injection, same pattern as the printed report's SanitizedHtml. */
function SanitizedHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function AnalisisTab({ data }: { data: PmApplicationDetail }) {
  const technical = data.assignments.technical;
  const moduleKeys = data.verificationType === "VKI" ? VKI_MODULE_KEYS : VIU_MODULE_KEYS;

  if (!technical) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada penugasan analisis teknis untuk permohonan ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {moduleKeys.map((key) => {
        const moduleData = technical.technicalAnalysisData[key] ?? {};
        const status = moduleData.status ?? "PENDING";
        return (
          <div key={key} className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13.5px] font-extrabold text-[#20180f]">{TECHNICAL_MODULE_LABELS[key]}</div>
              <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[status as keyof typeof TECHNICAL_MODULE_STATUS_BADGE] ?? TECHNICAL_MODULE_STATUS_BADGE.PENDING}`}>
                {TECHNICAL_MODULE_STATUS_LABELS[status as keyof typeof TECHNICAL_MODULE_STATUS_LABELS] ?? status}
              </span>
            </div>
            {moduleData.keterangan && (
              <div className="mb-2 text-[12.5px] leading-relaxed text-[#4a4038]">
                <SanitizedHtml html={moduleData.keterangan} />
              </div>
            )}
            {moduleData.kesimpulan && (
              <div className="rounded-lg border border-dashed border-[#e8b1a3] bg-[#fbf8f4] p-3 text-[12.5px] leading-relaxed text-[#4a4038]">
                <SanitizedHtml html={moduleData.kesimpulan} />
              </div>
            )}
            {!moduleData.keterangan && !moduleData.kesimpulan && <p className="text-[12.5px] text-[#a68f80]">Belum dianalisis.</p>}
          </div>
        );
      })}
    </div>
  );
}
