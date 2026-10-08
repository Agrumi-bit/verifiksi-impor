"use client";

import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import { formatAssignmentDate } from "@/lib/assignment-date";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_BADGE,
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
  DOCUMENT_REPORT_REVIEW_ITEMS,
  type DocumentReportReview,
} from "@/modules/technical-analyst-workspace/document-report-review";

/** Technical Analyst's review of this Laporan Verifikasi Dokumen — read-only, shown above the Draft Report. */
export function TechnicalReviewBanner({ assignmentId }: { assignmentId: string }) {
  const { data } = useQuery({
    queryKey: ["verifikator-workspace", "assignments", assignmentId, "technical-review"],
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/technical-review`);
      if (!response.ok) return null;
      return ((await response.json()) as { data: { review: DocumentReportReview; technicalReviewerName: string | null } | null }).data;
    },
  });
  const review = data?.review;
  if (!review?.decision) return null;

  const failed = DOCUMENT_REPORT_REVIEW_ITEMS.filter((item) => review.items[item.key]?.result === "FAIL");
  return (
    <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-[#f7f2ec] p-4 text-[12.5px] text-[#4a4038]">
      <div className="flex flex-wrap items-center gap-2">
        <MaterialIcon name="fact_check" className="text-[17px] text-[#2f6fe0]" />
        <span className="font-bold text-[#20180f]">Review Technical Analyst:</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${DOCUMENT_REPORT_REVIEW_DECISION_BADGE[review.decision]}`}>
          {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[review.decision]}
        </span>
        {review.verifiedAt && <span>· {formatAssignmentDate(review.verifiedAt)}</span>}
        {(review.verifiedByName ?? data?.technicalReviewerName) && <span>· oleh {review.verifiedByName ?? data?.technicalReviewerName}</span>}
      </div>
      {review.note && <div className="mt-1.5 pl-6">Catatan: {review.note}</div>}
      {failed.length > 0 && (
        <ul className="mt-1.5 list-disc pl-10">
          {failed.map((item) => (
            <li key={item.key}>
              <span className="font-semibold">{item.label}</span>
              {review.items[item.key]?.note ? ` — ${review.items[item.key]?.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
