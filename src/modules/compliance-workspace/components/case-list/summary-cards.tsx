"use client";

import { cn } from "@/lib/utils";
import { CASE_CATEGORIES, CASE_CATEGORY_LABELS } from "../../consolidation";
import type { QuickChip } from "../../case-list";

const ACCENT: Record<(typeof CASE_CATEGORIES)[number], string> = {
  MH: "bg-[#F59E0B]",
  SK: "bg-[#1677FF]",
  PTL: "bg-[#F97316]",
  OI: "bg-[#DC2626]",
  CL: "bg-[#16A34A]",
  SL: "bg-[#7C3AED]",
};

/** One card per bucket; clicking filters the table to it (click again to clear). */
export function SummaryCards({
  counts,
  active,
  onSelect,
}: {
  counts: Partial<Record<QuickChip, number>>;
  active: QuickChip | "";
  onSelect: (chip: QuickChip | "") => void;
}) {
  return (
    <section aria-label="Ringkasan permohonan" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {CASE_CATEGORIES.map((category) => {
        const isActive = active === category;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? "" : category)}
            className={cn(
              "flex flex-col gap-1 rounded-xl border bg-white px-4 py-3 text-left shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1677FF]",
              isActive ? "border-[#1677FF] ring-1 ring-[#1677FF]" : "border-[#E5EAF0] hover:border-[#C7D2E0]",
            )}
          >
            <span className="flex items-center gap-2 text-[12px] text-[#64748B]">
              <span className={cn("h-3 w-1 rounded-full", ACCENT[category])} aria-hidden />
              {CASE_CATEGORY_LABELS[category]}
            </span>
            <span className="text-2xl font-semibold tabular-nums">{counts[category] ?? 0}</span>
          </button>
        );
      })}
    </section>
  );
}
