"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import type { ChecklistItemValues } from "../../schema";
import {
  LOCATION_TYPE_ICON,
  LOCATION_TYPE_LABELS,
  LOCATION_VISIT_STATUS_LABELS,
  type LocationVisitStatusValue,
} from "../../status";
import { computeFindings as computeOfficeFindings, type OfficeVerificationValues } from "../office-verification/schema";
import { computeFindings as computeFieldFindings, type FieldVerificationValues } from "../field-verification/schema";

type LocationReportItem = {
  id: string;
  locationType: string;
  address: string;
  city: string | null;
  status: LocationVisitStatusValue;
  submittedAt: string | null;
  checklist: ChecklistItemValues[];
  reportSummary: string | null;
  fieldObservationNotes: string | null;
  officeVerification: OfficeVerificationValues | null;
  warehouseVerification: FieldVerificationValues | null;
  factoryVerification: FieldVerificationValues | null;
};

type Props = { assignmentId: string };

const STATUS_BADGE: Record<LocationVisitStatusValue, string> = {
  NOT_STARTED: "bg-[#f2f0ee] text-[#6b6259]",
  IN_PROGRESS: "bg-[#fdedd6] text-[#c1440e]",
  COMPLETED: "bg-[#e2f7ea] text-[#027a48]",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportTab({ assignmentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", assignmentId, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations`);
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: LocationReportItem[] };
      return json.data;
    },
  });

  const locations = data ?? [];
  const completedCount = locations.filter((l) => l.status === "COMPLETED").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <div className="mb-1 flex items-center gap-3.5">
          <MaterialIcon name="summarize" className="text-sv-primary-container" />
          <h3 className="font-sv-headline-lg text-[19px] font-bold">Laporan Verifikasi Lokasi</h3>
        </div>
        <div className="text-sm text-[#8a7565]">
          {completedCount} dari {locations.length} lokasi telah selesai diverifikasi.
        </div>
      </div>

      {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
      {!isLoading && locations.length === 0 && (
        <p className="text-sm text-[#8a7565]">Belum ada lokasi terdaftar untuk aplikasi ini.</p>
      )}

      {locations.map((loc) => {
        const label = LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType;
        const isOffice = loc.locationType === "KANTOR" && loc.officeVerification;
        const fieldKind = loc.locationType === "GUDANG" ? "GUDANG" : loc.locationType === "PABRIK" ? "PABRIK" : null;
        const fieldVerification = fieldKind === "GUDANG" ? loc.warehouseVerification : fieldKind === "PABRIK" ? loc.factoryVerification : null;
        const isField = fieldKind !== null && fieldVerification !== null;
        const findings = isOffice
          ? computeOfficeFindings(loc.officeVerification!)
          : isField
            ? computeFieldFindings(fieldKind!, fieldVerification!)
            : [];
        const passCount = loc.checklist.filter((c) => c.result === "PASS").length;
        const failCount = loc.checklist.filter((c) => c.result === "FAIL").length;
        const naCount = loc.checklist.filter((c) => c.result === "NA").length;

        return (
          <div key={loc.id} className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MaterialIcon
                  name={LOCATION_TYPE_ICON[loc.locationType] ?? "place"}
                  className="text-xl text-[#a68f80]"
                />
                <div>
                  <div className="text-[15px] font-bold">{label}</div>
                  <div className="text-xs text-[#8a7565]">
                    {loc.address}
                    {loc.city ? `, ${loc.city}` : ""}
                  </div>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[loc.status]}`}>
                {LOCATION_VISIT_STATUS_LABELS[loc.status]}
              </span>
            </div>

            {loc.status !== "COMPLETED" ? (
              <p className="text-sm text-[#8a7565]">Laporan belum tersedia — verifikasi lokasi ini belum selesai.</p>
            ) : isOffice ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#8a7565]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span>Status: {loc.officeVerification!.conclusionStatus ?? "—"}</span>
                  <span>Rekomendasi: {loc.officeVerification!.conclusionRecommendation ?? "—"}</span>
                  <span>Temuan ketidaksesuaian: {findings.length}</span>
                </div>
                {loc.officeVerification!.conclusionSummary && (
                  <p className="rounded-lg bg-[#fdf5f2] p-3 text-sm leading-relaxed text-[#4a4038]">
                    {loc.officeVerification!.conclusionSummary}
                  </p>
                )}
              </div>
            ) : isField ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#8a7565]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span>Status: {fieldVerification!.conclusionStatus ?? "—"}</span>
                  <span>Rekomendasi: {fieldVerification!.conclusionRecommendation ?? "—"}</span>
                  <span>Temuan ketidaksesuaian: {findings.length}</span>
                </div>
                {fieldVerification!.conclusionSummary && (
                  <p className="rounded-lg bg-[#fdf5f2] p-3 text-sm leading-relaxed text-[#4a4038]">
                    {fieldVerification!.conclusionSummary}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#8a7565]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span className="font-semibold text-[#027a48]">{passCount} Pass</span>
                  <span className="font-semibold text-[#ba1a1a]">{failCount} Fail</span>
                  <span>{naCount} N/A</span>
                </div>
                {(loc.reportSummary || loc.fieldObservationNotes) && (
                  <p className="rounded-lg bg-[#fdf5f2] p-3 text-sm leading-relaxed text-[#4a4038]">
                    {loc.reportSummary || loc.fieldObservationNotes}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Link
                href={
                  (isOffice || isField) && loc.status === "COMPLETED"
                    ? `/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}/report`
                    : `/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}`
                }
                className="rounded-lg border border-[#e8d5c5] bg-white px-4 py-2 text-xs font-semibold text-[#2b2420]"
              >
                Lihat Detail Laporan
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
