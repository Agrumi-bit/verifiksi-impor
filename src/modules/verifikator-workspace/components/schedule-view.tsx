"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { ASSIGNMENT_STATUS_LABELS, type AssignmentStatusValue } from "../status";

type ScheduleItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  dueDate: string;
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const days = daysUntil(item.dueDate);
  const urgent = days < 0;
  const soon = days >= 0 && days <= 3;

  return (
    <Link
      href={`/verifikator-workspace/assignments/${item.assignmentNumber}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e4e7f2] bg-white p-4 hover:bg-[#f6f7fb]"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 flex-col items-center justify-center rounded-lg text-xs font-bold ${
            urgent ? "bg-[#fbe4e4] text-[#c1352b]" : soon ? "bg-[#fdedd6] text-[#b3650c]" : "bg-[#eef0fa] text-[#3454d1]"
          }`}
        >
          <MaterialIcon name="event" className="text-base" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-[#1f2437]">{item.companyName}</div>
          <div className="text-xs text-[#8891ab]">
            {item.assignmentNumber} · {item.verificationType} · {ASSIGNMENT_STATUS_LABELS[item.status]}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold text-[#1f2437]">{fmtDate(item.dueDate)}</div>
        <div className={`text-xs font-semibold ${urgent ? "text-[#c1352b]" : soon ? "text-[#b3650c]" : "text-[#7d8398]"}`}>
          {urgent ? `Lewat ${Math.abs(days)} hari` : days === 0 ? "Jatuh tempo hari ini" : `${days} hari lagi`}
        </div>
      </div>
    </Link>
  );
}

export function ScheduleView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "schedule"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/schedule");
      if (!response.ok) throw new Error("Gagal memuat jadwal");
      const json = (await response.json()) as { data: ScheduleItem[] };
      return json.data;
    },
  });

  const items = data ?? [];

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#1f2437]">My Schedule</div>
        <div className="mt-1 max-w-[560px] text-[13px] text-[#7d8398]">
          Batas waktu validasi (due date) untuk assignment yang sedang Anda tangani, diurutkan dari yang paling
          mendesak.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#8891ab]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#c1352b]">Gagal memuat jadwal.</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p className="p-6 text-center text-[#8891ab]">Tidak ada assignment dengan due date yang tercatat.</p>
        )}
        {items.map((item) => (
          <ScheduleRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
