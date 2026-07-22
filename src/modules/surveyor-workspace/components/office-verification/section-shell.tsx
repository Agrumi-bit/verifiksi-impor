"use client";

import type { ReactNode } from "react";

import { MaterialIcon } from "../material-icon";

const ACCENTS = {
  blue: { bg: "#eaf2ff", border: "#3b82f6" },
  amber: { bg: "#fffbeb", border: "#f26522" },
  purple: { bg: "#f6effc", border: "#9333ea" },
  neutral: { bg: "#eef2f6", border: "#4a5568" },
} as const;

type Props = {
  index: number;
  title: string;
  accent?: keyof typeof ACCENTS;
  children: ReactNode;
  onSave: () => void;
  onSaveNext?: () => void;
  isSaving?: boolean;
  hideNext?: boolean;
};

export function SectionShell({
  index,
  title,
  accent = "blue",
  children,
  onSave,
  onSaveNext,
  isSaving,
  hideNext,
}: Props) {
  const a = ACCENTS[accent];
  return (
    <div className="mt-5 rounded-[14px] p-7" style={{ background: a.bg, border: `1.5px solid ${a.border}` }}>
      <div className="mb-2.5 text-xs font-extrabold tracking-wide text-[#1c2530]">SECTION {index}</div>
      <div className="mb-3.5 text-[17px] font-extrabold text-[#1c2530]">{title}</div>
      {children}
      <div className="mt-1 flex justify-end gap-2.5 border-t pt-3.5" style={{ borderColor: `${a.border}55` }}>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-[9px] bg-white px-[18px] py-2.5 text-[13px] font-bold disabled:opacity-60"
          style={{ border: `1px solid ${a.border}`, color: a.border }}
        >
          <MaterialIcon name="save" className="text-base" />
          Save
        </button>
        {!hideNext && (
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveNext}
            className="flex items-center gap-1.5 rounded-[9px] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            style={{ background: a.border }}
          >
            <MaterialIcon name="save" className="text-base" />
            Save &amp; Next
            <MaterialIcon name="chevron_right" className="text-base" />
          </button>
        )}
      </div>
    </div>
  );
}
