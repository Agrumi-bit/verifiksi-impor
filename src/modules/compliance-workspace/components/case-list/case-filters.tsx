"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { CASE_CATEGORIES, CASE_CATEGORY_LABELS } from "../../consolidation";
import type { QuickChip, SortKey } from "../../case-list";
import { WORKSPACE_KEYS, WORKSPACE_LABELS, WORKSPACE_STATE_LABELS, type WorkspaceState } from "../../workspace-status";
import { INPUT_CLASS } from "../styles";
import { ADVANCED_KEYS, type CaseFilters as Filters } from "./use-case-list";

const STATES: WorkspaceState[] = ["COMPLETED", "IN_PROGRESS", "NOT_STARTED", "ISSUE"];
const CHIPS: (QuickChip | "")[] = ["", ...CASE_CATEGORIES, "LH", "REVIEW"];
const CHIP_LABELS: Record<QuickChip, string> = { ...CASE_CATEGORY_LABELS, LH: "LHVIU Terbit", REVIEW: "Ditandai Review" };
const SORT_LABELS: Record<SortKey, string> = {
  updated: "Last Update",
  number: "No. Permohonan",
  submitted: "Tanggal Masuk",
  status: "Status",
  issues: "Issue",
};

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  pics: { id: string; name: string }[];
  counts: Partial<Record<QuickChip | "ALL", number>>;
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onToggleDir: () => void;
  view: "table" | "compact";
  onView: (view: "table" | "compact") => void;
};

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={INPUT_CLASS}>
      {children}
    </select>
  );
}

function AdvancedField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 text-[12px] text-[#64748B]"><span>{label}</span>{children}</div>;
}

const YES_NO = (
  <>
    <option value="">Semua</option>
    <option value="ya">Ya</option>
    <option value="tidak">Tidak</option>
  </>
);

export function CaseFilters({ filters, onChange, onReset, pics, counts, sort, dir, onSort, onToggleDir, view, onView }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedCount = ADVANCED_KEYS.filter((key) => filters[key]).length;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Cari permohonan</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
            <input
              type="search"
              value={filters.q}
              onChange={(event) => onChange({ q: event.target.value })}
              placeholder="Cari nomor permohonan, nama perusahaan, NIB..."
              className={cn(INPUT_CLASS, "w-full pl-8")}
            />
          </label>
          <Select label="Status" value={filters.chip} onChange={(value) => onChange({ chip: value as QuickChip | "" })}>
            <option value="">Semua Status</option>
            {CASE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{CASE_CATEGORY_LABELS[category]}</option>
            ))}
          </Select>
          <Select label="Workspace terakhir" value={filters.lastWorkspace} onChange={(value) => onChange({ lastWorkspace: value as Filters["lastWorkspace"] })}>
            <option value="">Semua Workspace Terakhir</option>
            {WORKSPACE_KEYS.map((key) => (
              <option key={key} value={key}>{WORKSPACE_LABELS[key]}</option>
            ))}
          </Select>
          <Select label="PIC Compliance" value={filters.pic} onChange={(value) => onChange({ pic: value })}>
            <option value="">Semua PIC Compliance</option>
            {pics.map((pic) => (
              <option key={pic.id} value={pic.id}>{pic.name}</option>
            ))}
          </Select>
          <span className="flex items-center gap-1.5">
            <input type="date" aria-label="Tanggal masuk dari" value={filters.from} onChange={(event) => onChange({ from: event.target.value })} className={INPUT_CLASS} />
            <span className="text-[#64748B]" aria-hidden>–</span>
            <input type="date" aria-label="Tanggal masuk sampai" value={filters.to} onChange={(event) => onChange({ to: event.target.value })} className={INPUT_CLASS} />
          </span>
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
            className={cn(INPUT_CLASS, "inline-flex items-center gap-1.5 font-medium hover:bg-[#F5F7FA]")}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filter Lanjutan
            {advancedCount > 0 && <span className="rounded-full bg-[#1677FF] px-1.5 text-[11px] text-white">{advancedCount}</span>}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasFilters}
            className={cn(INPUT_CLASS, "font-medium hover:bg-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-50")}
          >
            Reset Filter
          </button>
        </div>

        {advancedOpen && (
          <div className="mt-3 grid gap-3 border-t border-[#E5EAF0] pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["SV", "VF", "PM"] as const).map((key) => (
              <AdvancedField key={key} label={WORKSPACE_LABELS[key]}>
                <Select label={WORKSPACE_LABELS[key]} value={filters[`ws${key}`]} onChange={(value) => onChange({ [`ws${key}`]: value as WorkspaceState | "" })}>
                  <option value="">Semua</option>
                  {STATES.map((state) => (
                    <option key={state} value={state}>{WORKSPACE_STATE_LABELS[state]}</option>
                  ))}
                </Select>
              </AdvancedField>
            ))}
            <AdvancedField label="Ada Open Issue">
              <Select label="Ada Open Issue" value={filters.openIssue} onChange={(value) => onChange({ openIssue: value as Filters["openIssue"] })}>{YES_NO}</Select>
            </AdvancedField>
            <AdvancedField label="Ada Conflict Data">
              <Select label="Ada Conflict Data" value={filters.conflict} onChange={(value) => onChange({ conflict: value as Filters["conflict"] })}>{YES_NO}</Select>
            </AdvancedField>
            <AdvancedField label="LHVIU">
              <Select label="LHVIU" value={filters.lhviu} onChange={(value) => onChange({ lhviu: value as Filters["lhviu"] })}>
                <option value="">Semua</option>
                <option value="Terbit">Terbit</option>
                <option value="Belum Terbit">Belum Terbit</option>
              </Select>
            </AdvancedField>
            <AdvancedField label="Compliance Score">
              <Select label="Compliance Score" value={filters.score} onChange={(value) => onChange({ score: value as Filters["score"] })}>
                <option value="">Semua</option>
                <option value="100">100%</option>
                <option value="90">≥ 90%</option>
                <option value="75">≥ 75%</option>
                <option value="lt75">{"< 75%"}</option>
              </Select>
            </AdvancedField>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter cepat" className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => {
            const isOn = filters.chip === chip;
            return (
              <button
                key={chip || "ALL"}
                type="button"
                aria-pressed={isOn}
                onClick={() => onChange({ chip })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]",
                  isOn ? "border-[#1677FF] bg-[#1677FF] text-white" : "border-[#E5EAF0] bg-white text-[#10233F] hover:bg-[#F5F7FA]",
                )}
              >
                {chip ? CHIP_LABELS[chip] : "Semua"}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", isOn ? "bg-white/20" : "bg-[#F1F5F9] text-[#64748B]")}>
                  {counts[chip || "ALL"] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          Urutkan
          <Select label="Urutkan" value={sort} onChange={(value) => onSort(value as SortKey)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </Select>
        </label>
        <button
          type="button"
          onClick={onToggleDir}
          aria-label={dir === "asc" ? "Urutan naik, ubah ke turun" : "Urutan turun, ubah ke naik"}
          className={cn(INPUT_CLASS, "w-9 px-0 hover:bg-[#F5F7FA]")}
        >
          {dir === "asc" ? "↑" : "↓"}
        </button>
        <div role="group" aria-label="Mode tampilan" className="flex overflow-hidden rounded-lg border border-[#E5EAF0] bg-white">
          {(["table", "compact"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => onView(mode)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1677FF]",
                view === mode ? "bg-[#10233F] text-white" : "text-[#10233F] hover:bg-[#F5F7FA]",
              )}
            >
              {mode === "table" ? "Table" : "Compact"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
