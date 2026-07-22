"use client";

import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { SECTION_TITLES, type SectionKind } from "./schema";

const SECTION_STATE: Record<
  SectionKind,
  { bg: string; border: string; icon: string; iconColor: string; tagBg: string; tagColor: string; tagLabel: string }
> = {
  issue: {
    bg: "#fdecec",
    border: "#dc2626",
    icon: "error",
    iconColor: "#dc2626",
    tagBg: "#fbd5d5",
    tagColor: "#b91c1c",
    tagLabel: "Ada Ketidaksesuaian",
  },
  ok: {
    bg: "#e8f8ee",
    border: "#16a34a",
    icon: "check_circle",
    iconColor: "#16a34a",
    tagBg: "#c8ecd6",
    tagColor: "#166534",
    tagLabel: "Selesai",
  },
  unfilled: {
    bg: "#fdf6e3",
    border: "#e6b800",
    icon: "radio_button_unchecked",
    iconColor: "#c9a200",
    tagBg: "#fbedb8",
    tagColor: "#8a6d00",
    tagLabel: "Belum Diisi",
  },
};

type Props = {
  kinds: SectionKind[];
  onSaveDraft: () => void;
  isSaving?: boolean;
};

export function OfficeVerificationSidebar({ kinds, onSaveDraft, isSaving }: Props) {
  const completedCount = kinds.filter((k) => k === "ok").length;

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col gap-3 overflow-y-auto bg-[#e9ebef] p-4">
      <div className="rounded-xl border-[1.5px] border-[#3b82f6] bg-[#eaf2ff] p-5 text-center">
        <div className="text-[14.5px] font-bold leading-tight text-[#1e3a8a]">
          Progress Verifikasi Lapangan (Kantor)
        </div>
        <div className="mt-2 text-[22px] font-extrabold text-[#1c2530]">
          <span className="text-[#3b82f6]">{completedCount}</span> / 9{" "}
          <span className="text-sm font-semibold text-[#6b7685]">Section Completed</span>
        </div>
      </div>

      {SECTION_TITLES.map((title, i) => {
        const state = SECTION_STATE[kinds[i]];
        return (
          <div
            key={title}
            className="flex items-start justify-between gap-3 rounded-xl p-4"
            style={{ background: state.bg, border: `1.5px solid ${state.border}` }}
          >
            <div className="min-w-0">
              <div className="mb-0.5 text-[14.5px] font-bold text-[#1c2530]">Section {i}</div>
              <div className="mb-2 text-[12.5px] text-[#5b6472]">{title}</div>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ background: state.tagBg, color: state.tagColor }}
              >
                {state.tagLabel}
              </span>
            </div>
            <MaterialIcon name={state.icon} className="shrink-0 text-[22px]" style={{ color: state.iconColor }} />
          </div>
        );
      })}

      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveDraft}
          className="flex-1 rounded-[9px] bg-[#dc2626] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          Save As Draft
        </button>
        <button
          type="button"
          onClick={() => toast.info("Fitur konsultasi akan tersedia di iterasi berikutnya.")}
          className="flex-1 rounded-[9px] border border-[#d7dbe0] bg-white py-2.5 text-[13px] font-bold text-[#1c2530]"
        >
          Consult
        </button>
        <button
          type="button"
          disabled
          className="flex-1 cursor-not-allowed rounded-[9px] bg-[#e5e7eb] py-2.5 text-[13px] font-bold text-[#9ca3af]"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
