"use client";

import Link from "next/link";
import { AlertTriangle, MoreHorizontal, SearchX } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CaseRow, SortKey } from "../../case-list";
import { COMPLIANCE_HOME } from "../../navigation";
import { CategoryBadge, HandoverBadge, LhviuBadge, ReadinessText, WorkspaceProgress } from "./badges";
import { formatDate, formatDateTime } from "./format";

const KIND_LABELS = { OPEN: "Open Issue", KLARIFIKASI: "Perlu Klarifikasi", CONFLICT: "Conflict", RESOLVED: "Resolved" } as const;

type Props = {
  rows: CaseRow[];
  isLoading: boolean;
  view: "table" | "compact";
  selected: Set<string>;
  onToggle: (id: string) => void;
  onTogglePage: () => void;
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onOpen: (row: CaseRow) => void;
  pics: { id: string; name: string }[];
  onAssignPic: (row: CaseRow, picUserId: string | null) => void;
  onToggleReview: (row: CaseRow) => void;
};

function SortHeader({ label, sortKey, sort, dir, onSort }: { label: string; sortKey: SortKey; sort: SortKey; dir: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  const isActive = sort === sortKey;
  return (
    <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 uppercase outline-none hover:text-[#10233F] focus-visible:text-[#1677FF]">
      {label}
      <span aria-hidden className="w-2">{isActive ? (dir === "asc" ? "▲" : "▼") : ""}</span>
      {isActive && <span className="sr-only">{dir === "asc" ? "urutan naik" : "urutan turun"}</span>}
    </button>
  );
}

function IssueCell({ row }: { row: CaseRow }) {
  if (row.activeFindings.length === 0) return <span className="text-[12px] text-[#64748B] tabular-nums">0</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(event) => event.stopPropagation()}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11.5px] font-medium text-[#B91C1C] outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-[#1677FF]"
      >
        {row.activeFindings.length} aktif
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] rounded-xl border border-[#E5EAF0] bg-white p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[12px] text-[#64748B]">Temuan aktif · {row.applicationNumber}</DropdownMenuLabel>
        {row.activeFindings.map((finding) => (
          <div key={finding.id} className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-[12.5px]">
            <span className="font-medium">{finding.issueNumber} · {KIND_LABELS[finding.kind]}</span>
            <span className="text-[#64748B]">{finding.title}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowMenu({ row, pics, onOpen, onAssignPic, onToggleReview }: { row: CaseRow } & Pick<Props, "pics" | "onOpen" | "onAssignPic" | "onToggleReview">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(event) => event.stopPropagation()}
        aria-label={`Aksi untuk ${row.applicationNumber}`}
        className="flex size-8 items-center justify-center rounded-lg text-[#64748B] outline-none hover:bg-[#F5F7FA] focus-visible:ring-2 focus-visible:ring-[#1677FF]"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl border border-[#E5EAF0] bg-white p-1.5">
        <DropdownMenuItem onClick={() => onOpen(row)}>Ringkasan Case</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}`} />}>Detail Case</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Assign PIC Compliance</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[200px] rounded-xl border border-[#E5EAF0] bg-white p-1.5">
            {pics.length === 0 && <DropdownMenuItem disabled>Belum ada user Compliance</DropdownMenuItem>}
            {pics.map((pic) => (
              <DropdownMenuItem key={pic.id} disabled={pic.id === row.picUserId} onClick={() => onAssignPic(row, pic.id)}>
                {pic.name}
              </DropdownMenuItem>
            ))}
            {row.picUserId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAssignPic(row, null)}>Kosongkan PIC</DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onToggleReview(row)}>{row.reviewFlag ? "Batalkan Tanda Review" : "Mark for Review"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const TH = "sticky top-0 z-10 whitespace-nowrap border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
const TD = "border-b border-[#EEF2F6] px-3 py-2.5 align-middle";

export function CaseTable(props: Props) {
  const { rows, isLoading, view, selected, onToggle, onTogglePage, sort, dir, onSort, onOpen } = props;
  const full = view === "table";
  const pageAllSelected = rows.length > 0 && rows.every((row) => selected.has(row.applicationId));
  const columnCount = full ? 14 : 9;

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
      <table className={cn("w-full border-separate border-spacing-0 text-[13px]", full ? "min-w-[1500px]" : "min-w-[960px]")} aria-busy={isLoading}>
        <caption className="sr-only">Daftar permohonan VIU Barang Konsumsi</caption>
        <thead>
          <tr>
            <th className={cn(TH, "w-10")}>
              <input type="checkbox" aria-label="Pilih semua di halaman ini" checked={pageAllSelected} onChange={onTogglePage} className="size-4 accent-[#1677FF]" />
            </th>
            <th className={TH}><SortHeader label={full ? "No. Permohonan" : "No. Case"} sortKey="number" sort={sort} dir={dir} onSort={onSort} /></th>
            <th className={TH}>{full ? "Pemohon" : "Company"}</th>
            {full && <th className={TH}>NIB</th>}
            {full && <th className={TH}>Jenis Permohonan</th>}
            {full && <th className={TH}><SortHeader label="Tgl Masuk" sortKey="submitted" sort={sort} dir={dir} onSort={onSort} /></th>}
            <th className={TH}>{full ? "Progress Workspace" : "Progress"}</th>
            {full && <th className={TH}>Status Handover</th>}
            <th className={TH}><SortHeader label={full ? "Compliance Status" : "Compliance"} sortKey="status" sort={sort} dir={dir} onSort={onSort} /></th>
            <th className={TH}><SortHeader label="Issue" sortKey="issues" sort={sort} dir={dir} onSort={onSort} /></th>
            <th className={TH}>LHVIU</th>
            {full && <th className={TH}>PIC Compliance</th>}
            <th className={TH}><SortHeader label={full ? "Last Update" : "Updated"} sortKey="updated" sort={sort} dir={dir} onSort={onSort} /></th>
            <th className={cn(TH, "w-12")}><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 8 }, (_, index) => (
              <tr key={`skeleton-${index}`} aria-hidden>
                {Array.from({ length: columnCount }, (_, cell) => (
                  <td key={cell} className={TD}><span className="block h-3 animate-pulse rounded bg-[#EEF2F6]" /></td>
                ))}
              </tr>
            ))}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-6 py-14 text-center">
                <div className="flex flex-col items-center gap-2 text-[#64748B]">
                  <SearchX className="size-6" aria-hidden />
                  <span className="text-[13px]">Tidak ada permohonan yang sesuai dengan filter.</span>
                </div>
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map((row) => (
              <tr key={row.applicationId} onClick={() => onOpen(row)} className="cursor-pointer hover:bg-[#F8FAFC]">
                <td className={TD} onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${row.applicationNumber}`}
                    checked={selected.has(row.applicationId)}
                    onChange={() => onToggle(row.applicationId)}
                    className="size-4 accent-[#1677FF]"
                  />
                </td>
                <th scope="row" className={cn(TD, "text-left font-normal")}>
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(row);
                      }}
                      className="whitespace-nowrap font-mono text-[12.5px] font-medium text-[#1677FF] outline-none hover:underline focus-visible:underline"
                    >
                      {row.applicationNumber}
                    </button>
                    {row.hasConflict && (
                      <AlertTriangle className="size-3.5 text-[#DC2626]" aria-label="Ada conflict data" role="img" />
                    )}
                    {row.reviewFlag && <span className="rounded bg-[#F3EEFF] px-1.5 text-[10.5px] font-semibold text-[#6D28D9]">Review</span>}
                  </span>
                </th>
                <td className={cn(TD, "min-w-[200px] max-w-[280px]")}><span className="line-clamp-2">{row.companyName}</span></td>
                {full && <td className={cn(TD, "font-mono text-[12px]")}>{row.nib}</td>}
                {full && <td className={cn(TD, "whitespace-nowrap")}>VIU – Barang Konsumsi</td>}
                {full && (
                  <td className={cn(TD, "whitespace-nowrap tabular-nums")}>
                    {formatDate(row.submittedAt)}
                    {row.submittedIsSystemDate && <span className="block text-[10.5px] text-[#64748B]">(tanggal input sistem)</span>}
                  </td>
                )}
                <td className={TD}><WorkspaceProgress workspaces={row.workspaces} completed={row.completedWorkspaces} /></td>
                {full && (
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1"><HandoverBadge handover={row.handover} /><ReadinessText readiness={row.readiness} /></div>
                  </td>
                )}
                <td className={TD}><CategoryBadge category={row.category} /></td>
                <td className={TD} onClick={(event) => event.stopPropagation()}><IssueCell row={row} /></td>
                <td className={TD}>
                  <div className="flex flex-col items-start gap-0.5">
                    <LhviuBadge issued={row.lhviuIssued} />
                    {row.lhviuNumber && <span className="font-mono text-[11px] text-[#64748B]">{row.lhviuNumber}</span>}
                  </div>
                </td>
                {full && <td className={cn(TD, "whitespace-nowrap")}>{row.picName ?? <span className="text-[#64748B]">—</span>}</td>}
                <td className={cn(TD, "whitespace-nowrap tabular-nums text-[12px] text-[#64748B]")}>{formatDateTime(row.updatedAt)}</td>
                <td className={TD} onClick={(event) => event.stopPropagation()}>
                  <RowMenu row={row} pics={props.pics} onOpen={onOpen} onAssignPic={props.onAssignPic} onToggleReview={props.onToggleReview} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
