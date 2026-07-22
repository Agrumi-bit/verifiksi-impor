"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { SCHEDULE_STATUS_META, mapToScheduleStatus, type ScheduleStatusValue } from "../status";
import { ScheduleCalendarView } from "./schedule/schedule-calendar";
import { ScheduleListView } from "./schedule/schedule-list";
import type { ScheduleItem } from "./schedule/schedule-types";

function useScheduleQuery() {
  return useQuery({
    queryKey: ["surveyor-workspace", "schedule"],
    queryFn: async () => {
      const response = await fetch("/api/surveyor-workspace/schedule");
      if (!response.ok) throw new Error("Gagal memuat jadwal");
      const json = (await response.json()) as { data: ScheduleItem[] };
      return json.data;
    },
  });
}

const STAT_META: { key: ScheduleStatusValue | "RESCHEDULED" | "CANCELLED"; label: string; icon: string; bg: string; textColor: string }[] = [
  { key: "SCHEDULED", label: "Scheduled", icon: "calendar_today", bg: "#f2f0ee", textColor: "#5f5e5e" },
  { key: "ON_PROGRESS", label: "On Progress", icon: "schedule", bg: "#ffe9e2", textColor: "#e0662e" },
  { key: "COMPLETED", label: "Completed", icon: "event_available", bg: "#e2f7ea", textColor: "#1a9850" },
  { key: "RESCHEDULED", label: "Rescheduled", icon: "event_repeat", bg: "#fdf1d6", textColor: "#b8860b" },
  { key: "CANCELLED", label: "Cancelled", icon: "cancel", bg: "#fce8e6", textColor: "#ba1a1a" },
];

export function ScheduleView() {
  const { data, isLoading, isError } = useScheduleQuery();
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showFilters, setShowFilters] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [jenisFilter, setJenisFilter] = useState("ALL");
  const [lokasiFilter, setLokasiFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusValue | "ALL">("ALL");

  const items = useMemo(() => data ?? [], [data]);

  const jenisOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.verificationType))).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (dateFilter && item.scheduledDate) {
        const key = new Date(item.scheduledDate).toISOString().slice(0, 10);
        if (key !== dateFilter) return false;
      }
      if (jenisFilter !== "ALL" && item.verificationType !== jenisFilter) return false;
      if (lokasiFilter && !(item.location ?? "").toLowerCase().includes(lokasiFilter.toLowerCase())) return false;
      if (statusFilter !== "ALL" && mapToScheduleStatus(item.status) !== statusFilter) return false;
      return true;
    });
  }, [items, dateFilter, jenisFilter, lokasiFilter, statusFilter]);

  const stats = useMemo(() => {
    const counts: Record<ScheduleStatusValue, number> = { SCHEDULED: 0, ON_PROGRESS: 0, COMPLETED: 0 };
    for (const item of items) counts[mapToScheduleStatus(item.status)] += 1;
    return counts;
  }, [items]);

  return (
    <div className="flex flex-col gap-5 p-7">
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">My Schedule</div>
          <div className="mt-1 text-[13px] text-[#8a7565]">
            Kelola dan pantau jadwal verifikasi lapangan Anda.
          </div>
        </div>
        <div className="flex rounded-lg bg-[#f0ded0] p-[3px]">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[12.5px] font-bold text-[#261813] ${viewMode === "calendar" ? "bg-white" : "bg-transparent"}`}
          >
            <MaterialIcon name="calendar_month" className="text-base" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[12.5px] font-bold text-[#261813] ${viewMode === "list" ? "bg-white" : "bg-transparent"}`}
          >
            <MaterialIcon name="list" className="text-base" />
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {STAT_META.map((stat) => (
          <div key={stat.key} className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
            <div>
              <div className="text-[12.5px] text-[#8a7565]">{stat.label}</div>
              <div className="mt-0.5 text-[22px] font-extrabold" style={{ color: stat.textColor }}>
                {stat.key === "RESCHEDULED" || stat.key === "CANCELLED" ? 0 : stats[stat.key]}
              </div>
            </div>
            <div className="flex size-[38px] items-center justify-center rounded-lg" style={{ background: stat.bg }}>
              <MaterialIcon name={stat.icon} className="text-[19px]" style={{ color: stat.textColor }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="filter_alt" className="text-lg text-[#594138]" />
            <span className="text-sm font-bold text-[#2b2420]">Filter Jadwal</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#261813]"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
            <MaterialIcon name={showFilters ? "expand_less" : "expand_more"} className="text-[15px]" />
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#f5ebe1] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Tanggal</div>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full rounded-lg bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Jenis Verifikasi</div>
              <select
                value={jenisFilter}
                onChange={(event) => setJenisFilter(event.target.value)}
                className="w-full rounded-lg bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                {jenisOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Lokasi Verifikasi</div>
              <input
                type="text"
                placeholder="Cari lokasi..."
                value={lokasiFilter}
                onChange={(event) => setLokasiFilter(event.target.value)}
                className="w-full rounded-lg bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none placeholder:text-[#a68f80]"
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Status</div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ScheduleStatusValue | "ALL")}
                className="w-full rounded-lg bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="ALL">Semua Status</option>
                {(Object.keys(SCHEDULE_STATUS_META) as ScheduleStatusValue[]).map((option) => (
                  <option key={option} value={option}>
                    {SCHEDULE_STATUS_META[option].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <p className="rounded-lg border border-[#e8b3a3] bg-[#fce8e6] p-3 text-sm text-[#ba1a1a]">
          Gagal memuat jadwal.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-[#8a7565]">Memuat...</p>
      ) : viewMode === "calendar" ? (
        <ScheduleCalendarView items={filteredItems} />
      ) : (
        <ScheduleListView items={filteredItems} />
      )}
    </div>
  );
}
