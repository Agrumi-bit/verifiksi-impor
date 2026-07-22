"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { LOCATION_TYPE_LABELS } from "../../status";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type LocationVisitItem = {
  id: string;
  locationType: string;
  address: string;
  city: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
};

type Props = { assignmentId: string; payload: ApplicationWizardValues };

export function ScheduleTab({ assignmentId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", assignmentId, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations`);
      if (!response.ok) throw new Error("Gagal memuat lokasi");
      const json = (await response.json()) as { data: LocationVisitItem[] };
      return json.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-8 shadow-sm">
        <div className="mb-1.5 flex items-center gap-3.5">
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#fff1ec]">
            <MaterialIcon name="calendar_today" className="text-sv-primary-container" />
          </div>
          <h3 className="font-sv-headline-lg text-[19px] font-bold">Verification Schedule</h3>
        </div>
        <div className="ml-[56px] text-sm text-[#8a7565]">Jadwal pelaksanaan verifikasi</div>
        <div className="ml-[56px] text-xs text-[#a68f80]">
          Setiap lokasi diverifikasi pada slot waktu terpisah
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
        {data?.map((loc) => {
          const isOpen = expanded === loc.id;
          const label = LOCATION_TYPE_LABELS[loc.locationType]?.replace(/ \(.+\)/, "") ?? loc.locationType;
          return (
            <div key={loc.id} className="overflow-hidden rounded-[14px] border border-[#f5c9a8] bg-[#fff8f6]">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : loc.id)}
                className="flex w-full items-center justify-between gap-4 px-[26px] py-5 text-left"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#ffe9e2]">
                    <MaterialIcon name="event" className="text-sv-primary-container" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-2.5">
                      <span className="text-[15px] font-bold">{label}</span>
                      <span className="rounded-full border border-[#e8d5c5] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#4a4038]">
                        {loc.scheduledDate
                          ? new Date(loc.scheduledDate).toLocaleDateString("id-ID")
                          : "Belum dijadwalkan"}
                      </span>
                    </div>
                    <div className="text-[13px] text-[#8a7565]">{loc.scheduledTime ?? "—"}</div>
                  </div>
                </div>
                <MaterialIcon
                  name={isOpen ? "expand_less" : "expand_more"}
                  className="shrink-0 text-[22px] text-sv-primary"
                />
              </button>
              {isOpen && (
                <div className="px-[26px] pb-[26px]">
                  <div className="mb-5 flex flex-col gap-3.5 border-t border-[#f5c9a8] pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#ffe9e2]">
                        <MaterialIcon name="calendar_today" className="text-[19px] text-sv-primary-container" />
                      </div>
                      <div>
                        <div className="text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                          Verification Date
                        </div>
                        <div className="text-[15px] font-bold">
                          {loc.scheduledDate
                            ? new Date(loc.scheduledDate).toLocaleDateString("id-ID")
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#ffe9e2]">
                        <MaterialIcon name="schedule" className="text-[19px] text-sv-primary-container" />
                      </div>
                      <div>
                        <div className="text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                          Estimated Time
                        </div>
                        <div className="text-[15px] font-bold">{loc.scheduledTime ?? "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#ffe9e2]">
                        <MaterialIcon name="location_on" className="text-[19px] text-sv-primary-container" />
                      </div>
                      <div>
                        <div className="text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                          Verification Location
                        </div>
                        <div className="text-[15px] font-bold">{loc.address}</div>
                        <div className="text-[12.5px] text-[#8a7565]">{loc.city}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info("Request Reschedule akan tersedia di iterasi berikutnya.")}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#e0662e] py-3 text-[13px] font-bold text-white"
                  >
                    <MaterialIcon name="edit_calendar" />
                    Request Reschedule
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
