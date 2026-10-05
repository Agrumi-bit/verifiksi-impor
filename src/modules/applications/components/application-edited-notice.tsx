import { AlertTriangle } from "lucide-react";

import type { ApplicationEditedNotice as Notice } from "../server/edited-after";

/** Workspace-side marker for an Admin edit made after this assignment was created. */
export function ApplicationEditedNotice({ notice }: { notice: Notice | undefined }) {
  if (!notice) return null;
  const when = new Date(notice.editedAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#f0c78a] bg-[#fdf0d5] p-3 text-[12.5px] text-[#7a4a10]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <div className="font-bold">Data permohonan diubah setelah penugasan dibuat</div>
        <div>
          Diubah oleh {notice.editedByName ?? "Admin"} pada {when}
          {notice.reason ? ` — alasan: ${notice.reason}` : ""}. Periksa kembali data yang sedang diverifikasi.
        </div>
      </div>
    </div>
  );
}
