import Link from "next/link";

import { MaterialIcon } from "../material-icon";
import { SCHEDULE_STATUS_META, mapToScheduleStatus } from "../../status";
import type { ScheduleItem } from "./schedule-types";

const GRID_COLS = "grid-cols-[1.4fr_1.6fr_0.7fr_1.8fr_1.1fr_1.6fr]";

function fmtDate(value: string | null): string {
  if (!value) return "Belum dijadwalkan";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function actionMeta(status: ScheduleItem["status"]) {
  const scheduleStatus = mapToScheduleStatus(status);
  if (scheduleStatus === "ON_PROGRESS") {
    return { label: "Continue Verification", icon: "edit", className: "bg-[#2f6fe0] text-white" };
  }
  if (scheduleStatus === "SCHEDULED") {
    return { label: "Start Verification", icon: "play_arrow", className: "bg-[#1a9850] text-white" };
  }
  return { label: "View Assignment", icon: "visibility", className: "border border-[#e1bfb3] bg-white text-[#261813]" };
}

export function ScheduleListView({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-[#f0ded0] bg-white p-6">
      <div className="mb-0.5 text-lg font-extrabold text-[#2b2420]">Daftar Jadwal Verifikasi</div>
      <div className="mb-5 text-[13px] text-[#8a7565]">{items.length} jadwal ditemukan</div>

      <div className="min-w-[900px]">
        <div className={`grid ${GRID_COLS} gap-3 rounded-lg bg-[#fdf5f2] px-1 py-2.5 text-[11px] font-bold tracking-wide text-[#a68f80] uppercase`}>
          <div>Tanggal &amp; Waktu</div>
          <div>Perusahaan</div>
          <div>Jenis</div>
          <div>Lokasi</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-[#a68f80]">Belum ada jadwal verifikasi.</p>
        )}

        {items.map((item) => {
          const meta = SCHEDULE_STATUS_META[mapToScheduleStatus(item.status)];
          const action = actionMeta(item.status);
          return (
            <div
              key={item.id}
              className={`grid ${GRID_COLS} items-center gap-3 rounded-lg border-b border-[#f5ebe1] px-2 py-4 hover:bg-[#fdf8f5]`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fdeadd]">
                  <MaterialIcon name="calendar_today" className="text-[18px] text-[#e0662e]" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-[#2b2420]">{fmtDate(item.scheduledDate)}</div>
                  <div className="flex items-center gap-1 text-xs text-[#8a7565]">
                    <MaterialIcon name="schedule" className="text-[13px]" />
                    {item.scheduledTime ?? "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[13.5px] font-bold text-[#2b2420]">{item.companyName}</div>
                <div className="text-[11.5px] text-[#a68f80]">Assignment ID: {item.assignmentNumber}</div>
              </div>

              <div>
                <span className="rounded-md bg-[#f2f0ee] px-2.5 py-0.5 text-[11px] font-bold text-[#4a4038]">
                  {item.verificationType}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MaterialIcon name="apartment" className="text-[17px] text-[#594138]" />
                <div className="text-[13.5px] font-bold text-[#2b2420]">
                  {item.location ?? "Lokasi belum ditentukan"}
                </div>
              </div>

              <div>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-bold text-white"
                  style={{ background: meta.bg }}
                >
                  <MaterialIcon name={meta.icon} className="text-[13px]" />
                  {meta.label}
                </span>
              </div>

              <div>
                <Link
                  href={`/verifikator-workspace/assignments/${item.assignmentNumber}`}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-bold ${action.className}`}
                >
                  <MaterialIcon name={action.icon} className="text-[15px]" />
                  {action.label}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
