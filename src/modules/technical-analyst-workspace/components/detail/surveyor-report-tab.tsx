"use client";

import Link from "next/link";

import { MaterialIcon } from "../material-icon";

type SurveyorReportTabProps = {
  survey: {
    locationVisits: { id: string; locationType: string; address: string; city: string | null; status: string; assignmentNumber: string }[];
  } | null;
};

export function SurveyorReportTab({ survey }: SurveyorReportTabProps) {
  if (!survey || survey.locationVisits.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada laporan survey lapangan untuk permohonan ini.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {survey.locationVisits.map((visit) => (
        <div key={visit.id} className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
          <div>
            <div className="text-[13.5px] font-bold text-[#2b2420]">{visit.locationType}</div>
            <div className="mt-0.5 text-[12px] text-[#8a7565]">
              {visit.address}
              {visit.city ? `, ${visit.city}` : ""}
            </div>
          </div>
          {visit.status === "COMPLETED" ? (
            <Link
              href={`/technical-analyst-workspace/assignments/${visit.assignmentNumber}/report/${visit.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-[#f0ded0] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#2b2420]"
            >
              <MaterialIcon name="description" className="text-[15px]" />
              Lihat Laporan
            </Link>
          ) : (
            <span className="text-[12px] text-[#a68f80]">Survey belum selesai</span>
          )}
        </div>
      ))}
    </div>
  );
}
