"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import type { PmApplicationDetail } from "./types";
import { PmApprovalDialog } from "./pm-approval-dialog";
import { formatAssignmentDate } from "@/lib/assignment-date";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const DECISION_META: Record<string, { label: string; bg: string; color: string }> = {
  VERIFIED: { label: "Sesuai", bg: "#e6f6ec", color: "#1a9850" },
  REJECTED: { label: "Tidak Sesuai", bg: "#fdeceb", color: "#e15241" },
  REVISION: { label: "Perlu Revisi", bg: "#fdf4de", color: "#c98a1f" },
};
const DEFAULT_RESULT = { label: "Belum Direview", bg: "#f1efe9", color: "#8a7565" };

export function SurveyTab({ data, applicationNumber }: { data: PmApplicationDetail; applicationNumber: string }) {
  const survey = data.assignments.survey;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ assignmentId: string; assignmentNumber: string; decision: "APPROVED" | "REJECTED" } | null>(null);

  if (!survey || survey.locationVisits.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada laporan survey lapangan untuk permohonan ini.
      </div>
    );
  }

  const total = survey.locationVisits.length;
  const completed = survey.locationVisits.filter((v) => v.status === "COMPLETED").length;
  const verified = survey.locationVisits.filter((v) => v.decision === "VERIFIED").length;
  const needsReview = survey.locationVisits.filter((v) => v.status === "COMPLETED" && v.decision !== "VERIFIED").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Each survey assignment carries its own PM decision — a per-location schedule means one approval per
  // location. Older API responses without `assignments` fall back to the single most-progressed row.
  const surveyAssignments = survey.assignments ?? [
    {
      id: survey.id,
      assignmentNumber: survey.assignmentNumber,
      pmReviewStatus: survey.pmReviewStatus,
      pmReviewNote: survey.pmReviewNote,
      pmReviewedAt: survey.pmReviewedAt,
      ready: survey.allLocationsCompleted,
    },
  ];
  const approvedCount = surveyAssignments.filter((a) => a.pmReviewStatus === "APPROVED").length;
  function assignmentFor(assignmentNumber: string) {
    return surveyAssignments.find((a) => a.assignmentNumber === assignmentNumber) ?? surveyAssignments[0];
  }
  function locationsOf(assignmentNumber: string) {
    return survey!.locationVisits.filter((v) => v.assignmentNumber === assignmentNumber).length;
  }
  function refresh() {
    setPending(null);
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "applications", data.verificationType, applicationNumber] });
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "dashboard"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-4 border-l-[3px] border-[#4a5fc1] pl-3.5">
          <div className="text-[13.5px] font-extrabold text-[#20180f]">Field Verification Summary</div>
          <div className="mt-0.5 text-[11.5px] text-[#a68f80]">Overview of field verification results from surveyor</div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-[9px] bg-[#eaf1fd] p-3.5 text-center">
            <div className="text-[19px] font-extrabold text-[#3355c8]">{total}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#5c6b9c]">Total Locations</div>
          </div>
          <div className="rounded-[9px] bg-[#e6f6ec] p-3.5 text-center">
            <div className="text-[19px] font-extrabold text-[#1a9850]">{completed}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#5c8a6b]">Completed</div>
          </div>
          <div className="rounded-[9px] bg-[#f2ecff] p-3.5 text-center">
            <div className="text-[19px] font-extrabold text-[#7a3fd6]">{verified}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#8a72b5]">Verified Sections</div>
          </div>
          <div className="rounded-[9px] bg-[#fdf1de] p-3.5 text-center">
            <div className="text-[19px] font-extrabold text-[#c9701f]">{needsReview}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#b58a5c]">Needs Review</div>
          </div>
          <div className="rounded-[9px] bg-[#e6f6ec] p-3.5 text-center">
            <div className="text-[19px] font-extrabold text-[#0f7a4d]">
              {approvedCount}/{surveyAssignments.length}
            </div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#5c8a6b]">Disetujui PM</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[12px] font-bold text-[#20180f]">
            <span>Overall Verification Progress</span>
            <span>
              {completed} / {total} Locations Completed
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#f1e9df]">
            <div className="h-full rounded-full bg-[#20180f]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {survey.locationVisits.map((visit) => {
        const isOpen = expanded[visit.id] ?? false;
        const resultMeta = visit.decision ? DECISION_META[visit.decision] : DEFAULT_RESULT;
        return (
          <div key={visit.id} className="rounded-[10px] border border-[#f0ded0] bg-white">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpanded((prev) => ({ ...prev, [visit.id]: !isOpen }))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExpanded((prev) => ({ ...prev, [visit.id]: !isOpen }));
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-2.5">
                <MaterialIcon name={isOpen ? "expand_more" : "chevron_right"} className="text-[16px] text-[#a68f80]" />
                <MaterialIcon name="location_on" className="text-[16px] text-[#4a5fc1]" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-extrabold text-[#20180f]">{visit.locationType}</span>
                    <span className="rounded-full bg-[#4a5fc1] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {visit.status === "COMPLETED" ? "Submitted" : visit.status === "IN_PROGRESS" ? "In Progress" : "Not Started"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#a68f80]">
                    {visit.address}
                    {visit.city ? `, ${visit.city}` : ""}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10.5px] text-[#a68f80]">Review Verifikator</div>
                <span className="mt-0.75 inline-block rounded-full px-2.5 py-0.75 text-[11px] font-bold" style={{ background: resultMeta.bg, color: resultMeta.color }}>
                  {resultMeta.label}
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-[#f0ded0] p-4">
                <div className="mb-3 grid grid-cols-1 gap-3 rounded-[9px] bg-[#f7f2ec] p-3.5 sm:grid-cols-3">
                  <div>
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#a68f80]">
                      <MaterialIcon name="person" className="text-[13px]" />
                      Surveyor
                    </div>
                    <div className="mt-0.75 text-[12.5px] font-bold text-[#20180f]">{survey.surveyorName ?? "—"}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#a68f80]">
                      <MaterialIcon name="event" className="text-[13px]" />
                      Survey Date
                    </div>
                    <div className="mt-0.75 text-[12.5px] font-bold text-[#20180f]">{formatAssignmentDate(visit.surveyDate)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#a68f80]">
                      <MaterialIcon name="schedule" className="text-[13px]" />
                      Completed At
                    </div>
                    <div className="mt-0.75 text-[12.5px] font-bold text-[#20180f]">{formatAssignmentDate(visit.completedAt)}</div>
                  </div>
                </div>

                {visit.status === "COMPLETED" && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-[9px] bg-[#f7f2ec] p-3">
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="description" className="text-[16px] text-[#8a7565]" />
                      <div>
                        <div className="text-[10px] font-bold text-[#a68f80]">Field Report</div>
                        <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{visit.locationType} — {survey.assignmentNumber}</div>
                      </div>
                    </div>
                    <Link
                      href={`/project-manager-workspace/assignments/${visit.assignmentNumber}/report/${visit.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e0d5c8] bg-white px-3 py-1.75 text-[11.5px] font-bold text-[#5c4a3d]"
                    >
                      <MaterialIcon name="visibility" className="text-[14px]" />
                      View Report
                    </Link>
                  </div>
                )}

                <div className="mb-3 rounded-[9px] border border-[#f0ded0] bg-white p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-extrabold text-[#20180f]">Kesimpulan Surveyor</span>
                    <div className="flex gap-1.5">
                      <span className="rounded-full bg-[#fdeceb] px-2.5 py-0.75 text-[10.5px] font-bold text-[#c2503f]">{visit.findingsCount} Temuan</span>
                      {visit.findingsCount > 0 && (
                        <span className="rounded-full bg-[#fdeceb] px-2.5 py-0.75 text-[10.5px] font-bold text-[#c2503f]">Ada Ketidaksesuaian</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[12.5px] leading-relaxed text-[#5c4a3d]">{visit.surveyorConclusion || "Belum ada kesimpulan dari surveyor."}</div>
                </div>

                {visit.decisionNote && (
                  <div className="mb-3 rounded-lg border border-dashed border-[#e8b1a3] bg-[#fbf8f4] p-3 text-[12px] leading-relaxed text-[#4a4038]">
                    <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[#a68f80]">Kesimpulan Verifikator</div>
                    {visit.decisionNote}
                    {visit.verifiedByName && (
                      <div className="mt-1.5 text-[10.5px] text-[#a68f80]">
                        — {visit.verifiedByName}, {fmtDate(visit.verifiedAt)}
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                  const sa = assignmentFor(visit.assignmentNumber);
                  const shared = locationsOf(sa.assignmentNumber) > 1;
                  return (
                    <div className="rounded-[9px] border border-[#f0ded0] bg-white p-3.5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] font-extrabold text-[#20180f]">Persetujuan PM — Laporan Survey {sa.assignmentNumber}</span>
                        {sa.pmReviewStatus ? (
                          <span
                            className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${
                              sa.pmReviewStatus === "APPROVED" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#fbe4de] text-[#c1361f]"
                            }`}
                          >
                            {sa.pmReviewStatus === "APPROVED" ? "Disetujui" : "Ditolak"} · {formatAssignmentDate(sa.pmReviewedAt)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f2ece5] px-2.5 py-0.75 text-[10.5px] font-bold text-[#6b5b4c]">Belum Diputuskan</span>
                        )}
                      </div>
                      {sa.pmReviewNote && <div className="mb-2 text-[12px] text-[#6b5b4c]">Catatan: {sa.pmReviewNote}</div>}
                      {shared && (
                        <div className="mb-2 text-[11.5px] text-[#8a7565]">Berlaku untuk seluruh lokasi pada penugasan ini.</div>
                      )}
                      {!sa.pmReviewStatus && sa.ready && visit.decision !== "VERIFIED" && (
                        <div className="mb-2.5 flex items-start gap-2 rounded-lg bg-[#faf1de] px-3 py-2 text-[12px] text-[#a6791f]">
                          <MaterialIcon name="info" className="mt-0.5 text-[15px]" />
                          {visit.decision
                            ? "Verifikator tidak menyatakan laporan lokasi ini Sesuai — periksa kesimpulannya sebelum menyetujui."
                            : "Laporan lokasi ini belum direview verifikator."}
                        </div>
                      )}
                      {!sa.pmReviewStatus && (
                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            disabled={!sa.ready}
                            onClick={() => setPending({ assignmentId: sa.id, assignmentNumber: sa.assignmentNumber, decision: "APPROVED" })}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a9850] py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
                          >
                            <MaterialIcon name="task_alt" className="text-[16px]" />
                            {sa.ready ? "Review & Approve Laporan Survey" : "Menunggu Survey Lokasi Selesai"}
                          </button>
                          <button
                            type="button"
                            disabled={!sa.ready}
                            onClick={() => setPending({ assignmentId: sa.id, assignmentNumber: sa.assignmentNumber, decision: "REJECTED" })}
                            className="flex items-center justify-center gap-2 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.5 text-[13px] font-bold text-[#c1361f] disabled:opacity-50"
                          >
                            <MaterialIcon name="cancel" className="text-[16px]" />
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      <PmApprovalDialog
        assignmentId={pending?.assignmentId ?? ""}
        category="laporanSurvey"
        decision={pending?.decision ?? null}
        reportLabel={`Laporan Survey ${pending?.assignmentNumber ?? ""}`.trim()}
        approveHint="Laporan survey akan berstatus disetujui Project Manager; sampul laporan berganti menjadi TANGGAL TERBIT dengan tanggal hari ini."
        onClose={() => setPending(null)}
        onDone={refresh}
      />
    </div>
  );
}
