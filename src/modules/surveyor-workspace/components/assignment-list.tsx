"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_LABELS,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  LOCATION_TYPE_ICON,
  LOCATION_TYPE_LABELS,
  LOCATION_VISIT_STATUS_LABELS,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
  type LocationVisitStatusValue,
} from "../status";

type LocationRow = {
  locationKey: string;
  locationType: string;
  address: string;
  city: string | null;
  status: LocationVisitStatusValue;
  visitId: string | null;
  myAssignmentNumber: string | null;
  assignmentNumber: string | null;
};

type ApplicationCard = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  importTypes: string[];
  priority: AssignmentPriorityValue;
  status: AssignmentStatusValue;
  assignmentNumbers: string[];
  primaryAssignmentNumber: string;
  locationSummary: { total: number; completed: number };
  locations: LocationRow[];
};

type Stats = {
  total: number;
  assigned: number;
  inProgress: number;
  urgent: number;
  totalLocations: number;
  completedLocations: number;
};

const PAGE_SIZE = 10;

const STATUS_BADGE_CLASS: Record<AssignmentStatusValue, string> = {
  ASSIGNED: "bg-[#e8e6e3] text-[#4a4a4a]",
  SCHEDULED: "bg-[#e0662e] text-white",
  IN_PROGRESS: "bg-[#fdedd6] text-[#c1440e]",
  SUBMITTED: "bg-[#2d2926] text-white",
  RETURNED: "bg-[#b23b3b] text-white",
  COMPLETED: "bg-[#1a9850] text-white",
};

const PRIORITY_BADGE_CLASS: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#e8933a] text-white",
  HIGH: "bg-[#b23b3b] text-white",
  CRITICAL: "bg-[#b23b3b] text-white",
};

const LOCATION_STATUS_CLASS: Record<LocationVisitStatusValue, string> = {
  NOT_STARTED: "bg-[#f2f0ee] text-[#6b6259]",
  IN_PROGRESS: "bg-[#fdedd6] text-[#c1440e]",
  COMPLETED: "bg-[#e2f7ea] text-[#027a48]",
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function verificationLabel(card: ApplicationCard): string {
  const kinds = card.importTypes.map(humanize).join(", ");
  return kinds ? `${card.verificationType} · ${kinds}` : card.verificationType;
}

function locationSummaryLabel(summary: { total: number; completed: number }): string {
  return `${summary.total} lokasi · ${summary.completed} selesai`;
}

function StatCard({
  label,
  value,
  note,
  icon,
  valueClassName,
  iconWrapClassName,
}: {
  label: string;
  value: number;
  note?: string;
  icon: string;
  valueClassName?: string;
  iconWrapClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{label}</p>
        <h3 className={`mt-0.5 text-2xl font-extrabold text-[#2b2420] ${valueClassName ?? ""}`}>
          {String(value).padStart(2, "0")}
        </h3>
        {note && <p className="mt-0.5 text-[11px] text-[#a68f80]">{note}</p>}
      </div>
      <div className={`flex size-8.5 items-center justify-center rounded-lg text-base ${iconWrapClassName ?? "bg-[#f5ebe1]"}`}>
        <MaterialIcon name={icon} />
      </div>
    </div>
  );
}

function LocationLine({ row }: { row: LocationRow }) {
  const label = LOCATION_TYPE_LABELS[row.locationType] ?? row.locationType;
  const mine = row.myAssignmentNumber;
  const action = !mine
    ? null
    : row.status === "COMPLETED" && row.visitId
      ? { label: "Lihat Laporan", href: `/surveyor-workspace/assignments/${mine}/verify/${row.visitId}/report`, primary: false }
      : row.status === "IN_PROGRESS"
        ? { label: "Lanjutkan", href: `/surveyor-workspace/assignments/${mine}?tab=onsite`, primary: true }
        : { label: "Start", href: `/surveyor-workspace/assignments/${mine}?tab=onsite`, primary: true };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
      <div className="flex min-w-48 flex-1 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f5ebe1] text-[#c1440e]">
          <MaterialIcon name={LOCATION_TYPE_ICON[row.locationType] ?? "place"} className="text-[17px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-[#2b2420]">{label}</div>
          <div className="truncate text-[12px] text-[#8a7565]" title={row.address}>
            {row.address || "Alamat belum diisi"}
          </div>
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LOCATION_STATUS_CLASS[row.status]}`}>
        {LOCATION_VISIT_STATUS_LABELS[row.status]}
      </span>
      <div className="flex min-w-36 justify-end">
        {action ? (
          <Link
            href={action.href}
            className={
              action.primary
                ? "rounded-lg bg-[#e0662e] px-3.5 py-1.5 text-[12px] font-semibold text-white"
                : "rounded-lg border border-[#e8d5c5] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#2b2420]"
            }
          >
            {action.label}
          </Link>
        ) : (
          <span className="text-[11.5px] text-[#a68f80]">
            {row.assignmentNumber ? `Penugasan lain · ${row.assignmentNumber}` : "Belum ditugaskan"}
          </span>
        )}
      </div>
    </li>
  );
}

export function AssignmentList() {
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AssignmentStatusValue | "ALL">("ALL");
  const [priority, setPriority] = useState<AssignmentPriorityValue | "ALL">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", { q, status, priority, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/surveyor-workspace/assignments?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data penugasan");
      return (await response.json()) as {
        data: ApplicationCard[];
        total: number;
        page: number;
        pageSize: number;
        stats: Stats;
      };
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const stats = data?.stats ?? { total: 0, assigned: 0, inProgress: 0, urgent: 0, totalLocations: 0, completedLocations: 0 };

  return (
    <div className="p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">My Assignments</div>
          <div className="mt-1 max-w-130 text-[13px] text-[#8a7565]">
            Penugasan dikelompokkan per perusahaan. Tiap permohonan menampilkan semua lokasinya satu kali, lengkap dengan
            status survey masing-masing lokasi.
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => toast.info("Export List akan tersedia di iterasi berikutnya.")}
            className="rounded-lg border border-[#e8d5c5] bg-white px-4 py-2.25 text-[13px] font-semibold text-[#2b2420]"
          >
            ↓ Export List
          </button>
        </div>
      </div>

      <div className="mb-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="TOTAL PERUSAHAAN"
          value={stats.total}
          note={`${stats.totalLocations} lokasi · ${stats.completedLocations} selesai`}
          icon="domain"
          iconWrapClassName="bg-[#f5ebe1]"
        />
        <StatCard label="ASSIGNED" value={stats.assigned} icon="push_pin" valueClassName="text-[#d9531f]" iconWrapClassName="bg-[#fdeadd]" />
        <StatCard label="IN PROGRESS" value={stats.inProgress} icon="schedule" iconWrapClassName="bg-[#f5ebe1]" />
        <StatCard label="URGENT" value={stats.urgent} icon="priority_high" valueClassName="text-[#c0392b]" iconWrapClassName="bg-[#fbe4e0]" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white px-3.5 py-2.5">
        <div className="relative flex-1">
          <MaterialIcon name="search" className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[#a68f80]" />
          <input
            className="w-full border-none bg-transparent py-1 pl-6 text-[13px] text-[#2b2420] outline-none placeholder:text-[#a68f80]"
            placeholder="Cari perusahaan, Application ID, Assignment ID, atau alamat lokasi"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AssignmentStatusValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">All Statuses</option>
          {ASSIGNMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={priority}
          onChange={(event) => {
            setPriority(event.target.value as AssignmentPriorityValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">All Priorities</option>
          {ASSIGNMENT_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap border-l border-[#f0ded0] pl-3.5 text-xs text-[#a68f80]">
          Showing {rangeStart}-{rangeEnd} of {total}
        </span>
        <div className="flex gap-1.5 border-l border-[#f0ded0] pl-2.5 text-[#a68f80]">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="disabled:opacity-30">
            ‹
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="disabled:opacity-30">
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#b23b3b]">Gagal memuat data penugasan.</p>}
        {!isLoading && !isError && data?.data.length === 0 && <p className="p-6 text-center text-[#a68f80]">Belum ada penugasan yang sesuai.</p>}
        {data?.data.map((card) => (
          <article key={card.applicationId} className="rounded-[10px] border border-[#f0ded0] bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-[15px] font-bold text-[#2b2420]">{card.companyName}</h3>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${STATUS_BADGE_CLASS[card.status]}`}>
                  {ASSIGNMENT_STATUS_LABELS[card.status]}
                </span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${PRIORITY_BADGE_CLASS[card.priority]}`}>
                  {ASSIGNMENT_PRIORITY_LABELS[card.priority].toUpperCase()}
                </span>
              </div>
              <Link
                href={`/surveyor-workspace/assignments/${card.primaryAssignmentNumber}?tab=onsite`}
                className="rounded-lg border border-[#e8d5c5] bg-white px-3.25 py-1.75 text-[12.5px] font-semibold text-[#2b2420]"
              >
                View Assignment
              </Link>
            </div>

            <dl className="mb-2 grid grid-cols-1 gap-x-5 gap-y-2 text-[12.5px] text-[#4a4038] md:grid-cols-3">
              <div>
                <dt className="text-[#a68f80]">Application ID</dt>
                <dd className="font-semibold">{card.applicationNumber}</dd>
              </div>
              <div>
                <dt className="text-[#a68f80]">Jenis Verifikasi</dt>
                <dd className="font-semibold">{verificationLabel(card)}</dd>
              </div>
              <div>
                <dt className="text-[#a68f80]">Lokasi</dt>
                <dd className="font-semibold">{locationSummaryLabel(card.locationSummary)}</dd>
              </div>
            </dl>

            <ul className="divide-y divide-[#f5ebe1] border-t border-[#f5ebe1]">
              {card.locations.map((row) => (
                <LocationLine key={row.locationKey} row={row} />
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#f0ded0] pt-4">
        <p className="text-[11.5px] text-[#a68f80]">Industrial Verification Platform | {total} perusahaan/permohonan</p>
        <nav className="flex gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(0, 6)
            .map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={
                  pageNumber === page
                    ? "flex size-6.5 items-center justify-center rounded-md bg-[#e0662e] text-xs font-semibold text-white"
                    : "flex size-6.5 items-center justify-center rounded-md text-xs font-semibold text-[#4a4038]"
                }
              >
                {pageNumber}
              </button>
            ))}
        </nav>
      </div>
    </div>
  );
}
