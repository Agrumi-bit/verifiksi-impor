"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import { LOCATION_TYPE_ICON, LOCATION_TYPE_LABELS, LOCATION_VISIT_STATUS_LABELS, type LocationVisitStatusValue } from "../../status";
import { computeFindings as computeOfficeFindings, type OfficeVerificationValues } from "@/modules/surveyor-workspace/components/office-verification/schema";
import { computeFindings as computeFieldFindings, type FieldVerificationValues } from "@/modules/surveyor-workspace/components/field-verification/schema";
import type { ChecklistItemValues } from "@/modules/surveyor-workspace/schema";
import type { LocationVisitSummary } from "../assignment-detail";

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

const STATUS_BADGE: Record<LocationVisitStatusValue, string> = {
  NOT_STARTED: "bg-[#eef0f6] text-[#5b6478]",
  IN_PROGRESS: "bg-[#fdedd6] text-[#b3650c]",
  COMPLETED: "bg-[#e1f3ea] text-[#0f7a4d]",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Props = { assignmentId: string; locationVisits: LocationVisitSummary[] };

export function SurveyReportTab({ assignmentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["verifikator-workspace", "assignments", assignmentId, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/locations`);
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: LocationReportItem[] };
      return json.data;
    },
  });

  const locations = data ?? [];
  const completedCount = locations.filter((l) => l.status === "COMPLETED").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e4e7f2] bg-white p-7 shadow-sm">
        <div className="mb-1 flex items-center gap-3.5">
          <MaterialIcon name="summarize" className="text-[#3454d1]" />
          <h3 className="text-[19px] font-bold">Laporan Hasil Survey (Report Preview)</h3>
        </div>
        <div className="text-sm text-[#7d8398]">
          {completedCount} dari {locations.length} lokasi telah selesai disurvey. Laporan ditampilkan dalam format A4
          resmi — identik dengan hasil cetak/PDF.
        </div>
      </div>

      {isLoading && <p className="text-sm text-[#7d8398]">Memuat...</p>}
      {!isLoading && locations.length === 0 && (
        <p className="text-sm text-[#7d8398]">Belum ada lokasi terdaftar untuk aplikasi ini.</p>
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
          <div key={loc.id} className="rounded-[14px] border border-[#e4e7f2] bg-white p-7 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MaterialIcon name={LOCATION_TYPE_ICON[loc.locationType] ?? "place"} className="text-xl text-[#8891ab]" />
                <div>
                  <div className="text-[15px] font-bold">{label}</div>
                  <div className="text-xs text-[#8891ab]">
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
              <p className="text-sm text-[#7d8398]">Laporan belum tersedia — survey lokasi ini belum selesai.</p>
            ) : isOffice ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#7d8398]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span>Status: {loc.officeVerification!.conclusionStatus ?? "—"}</span>
                  <span>Rekomendasi Surveyor: {loc.officeVerification!.conclusionRecommendation ?? "—"}</span>
                  <span>Temuan ketidaksesuaian: {findings.length}</span>
                </div>
                {loc.officeVerification!.conclusionSummary && (
                  <p className="rounded-lg bg-[#f6f7fb] p-3 text-sm leading-relaxed text-[#3d4258]">
                    {loc.officeVerification!.conclusionSummary}
                  </p>
                )}
              </div>
            ) : isField ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#7d8398]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span>Status: {fieldVerification!.conclusionStatus ?? "—"}</span>
                  <span>Rekomendasi Surveyor: {fieldVerification!.conclusionRecommendation ?? "—"}</span>
                  <span>Temuan ketidaksesuaian: {findings.length}</span>
                </div>
                {fieldVerification!.conclusionSummary && (
                  <p className="rounded-lg bg-[#f6f7fb] p-3 text-sm leading-relaxed text-[#3d4258]">
                    {fieldVerification!.conclusionSummary}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#7d8398]">
                  <span>Tanggal submit: {fmtDate(loc.submittedAt)}</span>
                  <span className="font-semibold text-[#0f7a4d]">{passCount} Pass</span>
                  <span className="font-semibold text-[#c1352b]">{failCount} Fail</span>
                  <span>{naCount} N/A</span>
                </div>
                {(loc.reportSummary || loc.fieldObservationNotes) && (
                  <p className="rounded-lg bg-[#f6f7fb] p-3 text-sm leading-relaxed text-[#3d4258]">
                    {loc.reportSummary || loc.fieldObservationNotes}
                  </p>
                )}
              </div>
            )}

            {(isOffice || isField) && loc.status === "COMPLETED" && (
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/verifikator-workspace/assignments/${assignmentId}/report/${loc.id}`}
                  className="rounded-lg bg-[#3454d1] px-4 py-2 text-xs font-semibold text-white"
                >
                  Lihat Report Preview (A4)
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
