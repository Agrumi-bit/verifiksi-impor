"use client";

import Link from "next/link";

import { MaterialIcon } from "../material-icon";

type DocumentReportTabProps = {
  assignmentNumber: string;
  dokumen: { assignmentNumber: string; status: string } | null;
};

export function DocumentReportTab({ assignmentNumber, dokumen }: DocumentReportTabProps) {
  if (!dokumen) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada penugasan verifikasi dokumen untuk permohonan ini.
      </div>
    );
  }

  if (dokumen.status !== "COMPLETED") {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Verifikasi dokumen masih berlangsung — laporan tersedia setelah verifikator menyelesaikan review.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div>
        <div className="text-[13.5px] font-bold text-[#2b2420]">Laporan Verifikasi Dokumen</div>
        <div className="mt-0.5 text-[12px] text-[#8a7565]">{dokumen.assignmentNumber}</div>
      </div>
      <Link
        href={`/technical-analyst-workspace/assignments/${assignmentNumber}/document-report`}
        className="flex items-center gap-1.5 rounded-lg border border-[#f0ded0] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#2b2420]"
      >
        <MaterialIcon name="description" className="text-[15px]" />
        Lihat Laporan
      </Link>
    </div>
  );
}
