"use client";

import { useMemo, useState } from "react";

import { MaterialIcon } from "../material-icon";
import { SCHEDULE_STATUS_META, mapToScheduleStatus, type ScheduleStatusValue } from "../../status";
import type { ScheduleItem } from "./schedule-types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_LEGEND: { label: string; color: string }[] = [
  { label: "Scheduled", color: SCHEDULE_STATUS_META.SCHEDULED.bg },
  { label: "On Progress", color: SCHEDULE_STATUS_META.ON_PROGRESS.bg },
  { label: "Completed", color: SCHEDULE_STATUS_META.COMPLETED.bg },
];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

type Event = { company: string; time: string | null; status: ScheduleStatusValue; letterStatus: ScheduleItem["letterStatus"] };

export function ScheduleCalendarView({ items }: { items: ScheduleItem[] }) {
  const today = useMemo(() => new Date(), []);
  const [subView, setSubView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const byDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const item of items) {
      if (!item.scheduledDate) continue;
      const key = dateKey(new Date(item.scheduledDate));
      const events = map.get(key) ?? [];
      events.push({
        company: item.companyName,
        time: item.scheduledTime,
        status: mapToScheduleStatus(item.status),
        letterStatus: item.letterStatus,
      });
      map.set(key, events);
    }
    return map;
  }, [items]);

  const monthGrid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const weekGrid = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  function goPrev() {
    setCursor((c) =>
      subView === "month" ? new Date(c.getFullYear(), c.getMonth() - 1, 1) : new Date(c.getFullYear(), c.getMonth(), c.getDate() - 7),
    );
  }
  function goNext() {
    setCursor((c) =>
      subView === "month" ? new Date(c.getFullYear(), c.getMonth() + 1, 1) : new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7),
    );
  }

  const rangeLabel =
    subView === "month"
      ? `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : `${weekGrid[0].getDate()} ${MONTH_LABELS[weekGrid[0].getMonth()].slice(0, 3)} - ${weekGrid[6].getDate()} ${MONTH_LABELS[weekGrid[6].getMonth()].slice(0, 3)} ${weekGrid[6].getFullYear()}`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex rounded-lg bg-[#f0ded0] p-[3px]">
          <button
            type="button"
            onClick={() => setSubView("month")}
            className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-bold text-[#261813] ${subView === "month" ? "bg-white" : "bg-transparent"}`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setSubView("week")}
            className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-bold text-[#261813] ${subView === "week" ? "bg-white" : "bg-transparent"}`}
          >
            Week
          </button>
        </div>
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={goPrev} aria-label="Sebelumnya">
            <MaterialIcon name="chevron_left" className="cursor-pointer text-xl text-[#a68f80]" />
          </button>
          <span className="text-[15px] font-bold text-[#2b2420]">{rangeLabel}</span>
          <button type="button" onClick={goNext} aria-label="Berikutnya">
            <MaterialIcon name="chevron_right" className="cursor-pointer text-xl text-[#a68f80]" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {STATUS_LEGEND.map((legend) => (
            <div key={legend.label} className="flex items-center gap-1.5 text-xs text-[#594138]">
              <span className="inline-block size-[9px] rounded-full" style={{ background: legend.color }} />
              {legend.label}
            </div>
          ))}
        </div>
      </div>

      {subView === "month" ? (
        <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
          <div className="grid grid-cols-7 border-b border-[#f0ded0] bg-[#fdf5f2]">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="p-2.5 text-center text-[11.5px] font-bold text-[#8a7565]">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map((date) => {
              const isCurrentMonth = date.getMonth() === cursor.getMonth();
              const isToday = dateKey(date) === dateKey(today);
              const events = byDate.get(dateKey(date)) ?? [];
              const visible = events.slice(0, 2);
              const extra = events.length - visible.length;
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[100px] border-r border-b border-[#f5ebe1] p-2 ${isCurrentMonth ? "bg-white" : "bg-[#fdf8f5]"}`}
                >
                  <div className="mb-1.5 flex items-center">
                    <span
                      className="flex size-[22px] items-center justify-center rounded-full text-[12.5px] font-bold"
                      style={{
                        background: isToday ? "#e0662e" : "transparent",
                        color: isToday ? "#fff" : isCurrentMonth ? "#4a4038" : "#c9b9ae",
                      }}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  {visible.map((ev, i) => {
                    const meta = SCHEDULE_STATUS_META[ev.status];
                    return (
                      <div
                        key={i}
                        className="mb-[3px] truncate rounded px-1.5 py-[3px] text-[10.5px] font-bold"
                        style={{
                          background: `${meta.bg}1a`,
                          color: meta.bg,
                          borderLeft: `2px ${ev.letterStatus === "DRAFT" ? "dashed" : "solid"} ${meta.bg}`,
                        }}
                        title={ev.letterStatus === "DRAFT" ? `${ev.company} (Draft Surat Tugas)` : ev.company}
                      >
                        {ev.company}
                      </div>
                    );
                  })}
                  {extra > 0 && <div className="text-[10px] font-semibold text-[#a68f80]">+{extra} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
          {weekGrid.map((date, i) => {
            const isToday = dateKey(date) === dateKey(today);
            const events = byDate.get(dateKey(date)) ?? [];
            return (
              <div
                key={date.toISOString()}
                className={`min-h-[230px] border-r border-[#f5ebe1] p-3.5 ${i === 0 || i === 6 ? "bg-[#fdf8f5]" : "bg-white"}`}
              >
                <div className="mb-1 text-[11px] font-bold text-[#8a7565]">{WEEKDAY_LABELS[i]}</div>
                <div
                  className="mb-3 flex size-[26px] items-center justify-center rounded-full text-[15px] font-extrabold"
                  style={{ background: isToday ? "#e0662e" : "transparent", color: isToday ? "#fff" : "#261813" }}
                >
                  {date.getDate()}
                </div>
                {events.map((ev, idx) => {
                  const meta = SCHEDULE_STATUS_META[ev.status];
                  return (
                    <div
                      key={idx}
                      className="mb-1.5 rounded px-2 py-1.5 text-[11px] font-semibold text-[#261813]"
                      style={{
                        background: `${meta.bg}1a`,
                        borderLeft: `2px ${ev.letterStatus === "DRAFT" ? "dashed" : "solid"} ${meta.bg}`,
                      }}
                    >
                      <div>{ev.company}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold" style={{ color: meta.bg }}>
                        {ev.time ?? "—"}
                        {ev.letterStatus === "DRAFT" && (
                          <span className="rounded-full px-1.5 py-px text-[9px] font-bold" style={{ background: "#f2ece5", color: "#6b5b4c" }}>
                            Draft ST
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && <div className="text-[11px] text-[#c9b9ae]">No verification</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
