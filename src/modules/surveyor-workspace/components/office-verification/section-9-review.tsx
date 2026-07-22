"use client";

import { MaterialIcon } from "../material-icon";
import { SECTION_TITLES, type SectionKind } from "./schema";

const LABEL_MAP: Record<SectionKind, string> = { ok: "Selesai", issue: "Ada Ketidaksesuaian", unfilled: "Belum Diisi" };
const BG_MAP: Record<SectionKind, string> = { ok: "#e2f7ea", issue: "#fdecec", unfilled: "#fdf6e3" };
const COLOR_MAP: Record<SectionKind, string> = { ok: "#166534", issue: "#b91c1c", unfilled: "#8a6d00" };

type Props = {
  kinds: SectionKind[];
  onGoTo: (index: number) => void;
  onSave: () => void;
  onOpenSubmitConfirm: () => void;
  isSaving?: boolean;
};

export function Section9Review({ kinds, onGoTo, onSave, onOpenSubmitConfirm, isSaving }: Props) {
  const unfilled = kinds.filter((k) => k === "unfilled").length;
  const issues = kinds.filter((k) => k === "issue").length;
  const outstandingLabel =
    unfilled === 0 && issues === 0
      ? "Semua section telah lengkap dan sesuai. Siap untuk diajukan."
      : [
          unfilled ? `${unfilled} section belum diisi` : null,
          issues ? `${issues} section memiliki ketidaksesuaian` : null,
        ]
          .filter(Boolean)
          .join(", ") + ".";

  return (
    <div className="mt-5 rounded-[14px] border-[1.5px] border-[#4a5568] bg-[#eef2f6] p-7">
      <div className="mb-2.5 text-xs font-extrabold tracking-wide text-[#1c2530]">SECTION 9</div>
      <div className="mb-3.5 text-[17px] font-extrabold text-[#1c2530]">Review Keseluruhan Verifikasi Kantor</div>
      <p className="mb-5 text-[13.5px] leading-relaxed text-[#4a5568]">
        Ringkasan status setiap section verifikasi lapangan kantor sebelum diajukan.
      </p>

      <div className="mb-5 overflow-hidden rounded-xl border border-[#dbe4f0] bg-white">
        <div className="grid grid-cols-[0.6fr_2.4fr_1fr] gap-3 bg-[#f7f8fa] p-3 text-xs font-bold text-[#6b7685]">
          <div>Section</div>
          <div>Judul</div>
          <div>Status</div>
        </div>
        {SECTION_TITLES.map((title, i) => (
          <button
            type="button"
            key={title}
            onClick={() => onGoTo(i)}
            className="grid w-full grid-cols-[0.6fr_2.4fr_1fr] items-center gap-3 border-t border-[#eef1f5] p-3.5 text-left"
          >
            <div className="text-[13.5px] font-bold text-[#1c2530]">Section {i}</div>
            <div className="text-[13px] text-[#4a5568]">{title}</div>
            <div>
              <span
                className="whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold"
                style={{ background: BG_MAP[kinds[i]], color: COLOR_MAP[kinds[i]] }}
              >
                {LABEL_MAP[kinds[i]]}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#f0d98a] bg-[#fdf6e3] p-4">
        <MaterialIcon name="info" className="text-[19px] text-[#8a6d00]" />
        <div className="text-[13px] text-[#8a6d00]">{outstandingLabel}</div>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-[#e0e5eb] pt-3.5">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-[9px] border border-[#4a5568] bg-white px-[18px] py-2.5 text-[13px] font-bold text-[#4a5568] disabled:opacity-60"
        >
          <MaterialIcon name="save" className="text-base" />
          Save
        </button>
        <button
          type="button"
          onClick={onOpenSubmitConfirm}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#4a5568] px-[18px] py-2.5 text-[13px] font-bold text-white"
        >
          <MaterialIcon name="send" className="text-base" />
          Submit Verifikasi
        </button>
      </div>
    </div>
  );
}
