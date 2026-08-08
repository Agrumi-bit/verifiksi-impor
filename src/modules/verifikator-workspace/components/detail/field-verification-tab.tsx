"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";
import { LOCATION_TYPE_ICON, LOCATION_TYPE_LABELS, LOCATION_VISIT_STATUS_LABELS, type LocationVisitStatusValue } from "../../status";
import { computeFindings as computeOfficeFindings, type OfficeVerificationValues } from "@/modules/surveyor-workspace/components/office-verification/schema";
import { computeFindings as computeFieldFindings, type FieldVerificationValues } from "@/modules/surveyor-workspace/components/field-verification/schema";
import type { ChecklistItemValues } from "@/modules/surveyor-workspace/schema";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  REPORT_CHECKLIST_SECTIONS,
  reportResultLabels,
  type ReportChecklistContext,
  type ReportChecklistItemDef,
} from "../../report-checklist-items";
import type { ReportItemResult, ReportItemResultValue, ReportDecisionValue, ReportVerificationState } from "../../report-verification";
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
  NOT_STARTED: "bg-[#eae5de] text-[#4a4038]",
  IN_PROGRESS: "bg-[#faf1de] text-[#a6791f]",
  COMPLETED: "bg-[#e2f7ea] text-[#1a9850]",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function stubToast() {
  toast.info("Fitur ini akan tersedia di iterasi berikutnya.");
}

type Props = {
  assignmentId: string;
  locationVisits: LocationVisitSummary[];
  surveyorName: string;
  applicationNumber: string;
  companyName: string;
  locations: ApplicationWizardValues["locations"];
};

export function FieldVerificationTab({ assignmentId, surveyorName, applicationNumber, companyName, locations: payloadLocations }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingLoc, setViewingLoc] = useState<LocationReportItem | null>(null);
  const [reviewingLoc, setReviewingLoc] = useState<LocationReportItem | null>(null);

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
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
        <div className="mb-1 flex items-center gap-2.5">
          <MaterialIcon name="summarize" className="text-[19px] text-[#e0662e]" />
          <h3 className="text-[15.5px] font-extrabold text-[#20180f]">Ringkasan Survey Lapangan</h3>
        </div>
        <div className="text-[13px] text-[#8a7565]">
          {completedCount} dari {locations.length} lokasi telah selesai disurvey.
        </div>
      </div>

      {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat...</p>}
      {!isLoading && locations.length === 0 && (
        <p className="text-[13px] text-[#8a7565]">Belum ada lokasi terdaftar untuk aplikasi ini.</p>
      )}

      <div className="flex flex-col gap-3">
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
          const conclusion = isOffice
            ? loc.officeVerification!.conclusionSummary
            : isField
              ? fieldVerification!.conclusionSummary
              : loc.reportSummary || loc.fieldObservationNotes;
          const hasReport = (isOffice || isField) && loc.status === "COMPLETED";
          const isExpanded = expandedId === loc.id;

          return (
            <div key={loc.id} className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId((prev) => (prev === loc.id ? null : loc.id))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedId((prev) => (prev === loc.id ? null : loc.id));
                  }
                }}
                className="flex cursor-pointer items-start justify-between gap-3 p-4.5"
              >
                <div className="flex items-start gap-2">
                  <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="mt-0.5 text-[18px] text-[#8a7565]" />
                  <MaterialIcon name={LOCATION_TYPE_ICON[loc.locationType] ?? "place"} className="mt-0.5 text-[18px] text-[#2f6fe0]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-extrabold text-[#20180f]">{label}</span>
                      <span className="rounded-full bg-[#2f6fe0] px-2.5 py-0.75 text-[10.5px] font-bold text-white">
                        {LOCATION_VISIT_STATUS_LABELS[loc.status]}
                      </span>
                      <span className="rounded-full border border-[#e1bfb3] bg-white px-2.5 py-0.75 text-[10.5px] font-bold text-[#4a4038]">
                        {label}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-[#8a7565]">
                      {loc.address}
                      {loc.city ? `, ${loc.city}` : ""}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mb-1 text-[11px] text-[#8a7565]">Status Hasil Survey</div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[loc.status]}`}>
                    {LOCATION_VISIT_STATUS_LABELS[loc.status]}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-3.5 border-t border-[#f5ebe1] p-4.5 pt-4">
                  <div className="grid grid-cols-1 gap-3.5 rounded-[9px] bg-[#f7f2ec] p-3.5 sm:grid-cols-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
                        <MaterialIcon name="person" className="text-[15px]" />
                        Surveyor
                      </div>
                      <div className="mt-0.75 text-[13px] font-bold text-[#20180f]">{surveyorName || "—"}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
                        <MaterialIcon name="calendar_month" className="text-[15px]" />
                        Survey Date
                      </div>
                      <div className="mt-0.75 text-[13px] font-bold text-[#20180f]">{fmtDate(loc.submittedAt)}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
                        <MaterialIcon name="schedule" className="text-[15px]" />
                        Completed At
                      </div>
                      <div className="mt-0.75 text-[13px] font-bold text-[#20180f]">{fmtDate(loc.submittedAt)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[9px] bg-[#f7f2ec] p-3.5">
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="description" className="text-[18px] text-[#2f6fe0]" />
                      <div>
                        <div className="text-[11px] text-[#8a7565]">Draft Report</div>
                        <div className="text-[13px] font-bold text-[#20180f]">{hasReport ? "Tersedia" : "Belum tersedia"}</div>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={stubToast}
                        className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#a68f80]"
                      >
                        <MaterialIcon name="visibility" className="text-[15px]" />
                        View Verification
                      </button>
                      {hasReport ? (
                        <button
                          type="button"
                          onClick={() => setViewingLoc(loc)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813]"
                        >
                          <MaterialIcon name="visibility" className="text-[15px]" />
                          View Report
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#a68f80] opacity-60"
                        >
                          <MaterialIcon name="visibility" className="text-[15px]" />
                          View Report
                        </button>
                      )}
                    </div>
                  </div>

                  {loc.status === "COMPLETED" && (
                    <div className="rounded-[9px] border border-[#efe2d4] p-4">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[13.5px] font-extrabold text-[#20180f]">Kesimpulan Surveyor</div>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-[#fbe4de] px-2.5 py-1 text-[11px] font-bold text-[#c1361f]">
                            {findings.length} Temuan
                          </span>
                          {findings.length > 0 && (
                            <span className="rounded-full bg-[#fbe4de] px-2.5 py-1 text-[11px] font-bold text-[#c1361f]">
                              Ada Ketidaksesuaian
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#f7f2ec] p-3 text-[12.5px] leading-relaxed text-[#4a4038]">
                        {conclusion || "Tidak ada catatan tambahan dari surveyor."}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!hasReport}
                    onClick={() => setReviewingLoc(loc)}
                    className="flex items-center justify-center gap-2 rounded-[9px] bg-[#16a34a] py-3 text-[13.5px] font-bold text-white disabled:opacity-60"
                  >
                    <MaterialIcon name="play_circle" className="text-[18px]" />
                    Mulai Review Laporan Verifikasi Lapangan
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewingLoc && (
        <ReportViewModal
          assignmentId={assignmentId}
          loc={viewingLoc}
          surveyorName={surveyorName}
          onClose={() => setViewingLoc(null)}
        />
      )}

      {reviewingLoc && (
        <ReportVerificationModal
          assignmentId={assignmentId}
          loc={reviewingLoc}
          context={buildReportChecklistContext(reviewingLoc, { applicationNumber, companyName, surveyorName, payloadLocations })}
          onClose={() => setReviewingLoc(null)}
        />
      )}
    </div>
  );
}

function documentationCountFor(loc: LocationReportItem): number {
  const verification = loc.officeVerification ?? loc.warehouseVerification ?? loc.factoryVerification;
  if (!verification) return 0;
  return Object.values(verification.documentation ?? {}).filter((d) => d.filePath).length;
}

function buildReportChecklistContext(
  loc: LocationReportItem,
  extra: { applicationNumber: string; companyName: string; surveyorName: string; payloadLocations: ApplicationWizardValues["locations"] },
): ReportChecklistContext {
  const matchedLocation = (extra.payloadLocations ?? []).find((l) => l.locationType === loc.locationType);
  return {
    applicationNumber: extra.applicationNumber,
    companyName: extra.companyName,
    surveyorName: extra.surveyorName,
    visitDate: loc.officeVerification?.actualVisitDate || loc.submittedAt,
    address: loc.address,
    city: loc.city,
    buildingStatus: matchedLocation?.buildingStatus ?? null,
    documentationCount: documentationCountFor(loc),
  };
}

function ReportInfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#8a7565]">
        <MaterialIcon name={icon} className="text-[14px]" />
        {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-bold text-[#20180f]">{children}</div>
    </div>
  );
}

/**
 * Shows the surveyor's report in-place — a scrollable preview pane (reusing
 * the same `ReportRouter` the surveyor's own workspace and the standalone
 * report page render) plus a "Report Information" side panel, mirroring the
 * Documents Verification review modal's layout instead of navigating away.
 */
function ReportViewModal({
  assignmentId,
  loc,
  surveyorName,
  onClose,
}: {
  assignmentId: string;
  loc: LocationReportItem;
  surveyorName: string;
  onClose: () => void;
}) {
  const label = LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Laporan Survey — {label}</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              {loc.address}
              {loc.city ? `, ${loc.city}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]"
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex-1 overflow-auto rounded-lg border border-[#efe2d4] bg-white p-4">
            <ReportRouter assignmentId={assignmentId} locationId={loc.id} basePath="/api/verifikator-workspace" />
          </div>
          <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-[#efe2d4] p-3.5">
            <div className="text-[12.5px] font-extrabold text-[#20180f]">Report Information</div>
            <ReportInfoRow icon="place" label="Lokasi">
              {label}
            </ReportInfoRow>
            <ReportInfoRow icon="fact_check" label="Status">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[loc.status]}`}>
                {LOCATION_VISIT_STATUS_LABELS[loc.status]}
              </span>
            </ReportInfoRow>
            <ReportInfoRow icon="person" label="Surveyor">
              {surveyorName || "—"}
            </ReportInfoRow>
            <ReportInfoRow icon="calendar_month" label="Survey Date">
              {fmtDate(loc.submittedAt)}
            </ReportInfoRow>
            <ReportInfoRow icon="schedule" label="Completed At">
              {fmtDate(loc.submittedAt)}
            </ReportInfoRow>
          </div>
        </div>
      </div>
    </div>
  );
}

const RESULT_ORDER: ReportItemResultValue[] = ["PASS", "FAIL", "NA"];
const RESULT_STYLE: Record<ReportItemResultValue, string> = {
  PASS: "border-[#16a34a] bg-[#e2f7ea] text-[#1a9850]",
  FAIL: "border-[#dc2626] bg-[#fbe4de] text-[#c1361f]",
  NA: "border-[#c9820f] bg-[#fdf0d5] text-[#a6791f]",
};

function ReportChecklistItemRow({
  item,
  value,
  sourceValue,
  disabled,
  onSelect,
  onNoteBlur,
}: {
  item: ReportChecklistItemDef;
  value: ReportItemResult | null;
  sourceValue?: string | null;
  disabled: boolean;
  onSelect: (result: ReportItemResultValue) => void;
  onNoteBlur: (note: string) => void;
}) {
  const [note, setNote] = useState(value?.note ?? "");
  const labels = reportResultLabels(item);

  return (
    <div className="rounded-lg border border-[#efe2d4] p-3">
      <div className="text-[12.5px] font-extrabold text-[#20180f]">
        {item.no}. {item.title}
      </div>
      <div className="mt-2 rounded-md bg-[#faf7f4] p-2 text-[11.5px] text-[#4a4038]">
        <span className="text-[10px] font-bold uppercase text-[#8a7565]">Pertanyaan Verifikasi</span>
        <div className="mt-0.5">{item.question}</div>
      </div>
      {item.dataSource && <div className="mt-2 text-[11px] text-[#8a7565]">Sumber data: {item.dataSource}</div>}
      {item.getValue && sourceValue && (
        <div className="mt-1.5 rounded-md border border-[#cfe0fb] bg-[#eaf1fc] p-2">
          <div className="text-[10px] font-bold uppercase text-[#2f6fe0]">Data pada Sistem</div>
          <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{sourceValue}</div>
        </div>
      )}
      {item.examples && item.examples.length > 0 && (
        <div className="mt-2 text-[11px] text-[#8a7565]">
          <span className="font-bold">Contoh:</span>
          <ul className="mt-1 list-disc pl-4">
            {item.examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-2 text-[10px] font-bold uppercase text-[#8a7565]">Kriteria Verifikasi</div>
      <ul className="mt-1 list-disc pl-4 text-[11.5px] text-[#4a4038]">
        {item.criteria.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-2.5 text-[10px] font-bold uppercase text-[#8a7565]">Hasil Verifikasi</div>
      <div className="mt-1.5 flex gap-2">
        {RESULT_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(r)}
            className={
              "rounded-full border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 " +
              (value?.result === r ? RESULT_STYLE[r] : "border-[#e1bfb3] bg-white text-[#4a4038]")
            }
          >
            {r === "PASS" ? labels.pass : r === "FAIL" ? labels.fail : labels.na}
          </button>
        ))}
      </div>
      {value?.result === "FAIL" && (
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => onNoteBlur(note)}
          rows={2}
          placeholder="Catatan (opsional)..."
          disabled={disabled}
          className="mt-2 w-full resize-none rounded-md border border-[#e8dccd] bg-[#faf7f4] p-2 text-[11.5px] outline-none disabled:bg-[#f2ece5]"
        />
      )}
    </div>
  );
}

const DECISION_LABELS: Record<ReportDecisionValue, string> = { VERIFIED: "Verified", REJECTED: "Reject", REVISION: "Revisi" };

/**
 * "Uraian Verifikasi Laporan Hasil Survei Verifikasi Lapangan" — the
 * verifikator's own desk review over the surveyor's report, mirroring the
 * Documents Verification review modal: checklist on the left, the report
 * preview (via `ReportRouter`) on the right, final Verified/Reject/Revisi
 * decision at the bottom of the checklist column.
 */
function ReportVerificationModal({
  assignmentId,
  loc,
  context,
  onClose,
}: {
  assignmentId: string;
  loc: LocationReportItem;
  context: ReportChecklistContext;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [decisionNote, setDecisionNote] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<ReportDecisionValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const label = LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType;
  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "locations", loc.id, "report-verification"];

  const { data: state } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/locations/${loc.id}/report-verification`);
      if (!response.ok) throw new Error("Gagal memuat data review");
      const json = (await response.json()) as { data: ReportVerificationState };
      return json.data;
    },
  });

  const hasInitializedDecision = useRef(false);
  useEffect(() => {
    if (state && !hasInitializedDecision.current) {
      hasInitializedDecision.current = true;
      setSelectedDecision(state.decision);
      setDecisionNote(state.decisionNote ?? "");
    }
  }, [state]);

  async function saveItemPatch(itemId: string, patch: Partial<ReportItemResult>) {
    const previous = state;
    queryClient.setQueryData<ReportVerificationState | undefined>(queryKey, (current) =>
      current
        ? { ...current, items: { ...current.items, [itemId]: { ...(current.items[itemId] ?? { result: null, note: null }), ...patch } } }
        : current,
    );
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/locations/${loc.id}/report-verification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, ...patch }),
    });
    if (!response.ok) {
      queryClient.setQueryData(queryKey, previous);
      toast.error("Gagal menyimpan hasil verifikasi");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleSubmit() {
    if (!selectedDecision) {
      toast.error("Pilih keputusan (Verified/Reject/Revisi) terlebih dahulu.");
      return;
    }
    setIsSaving(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/locations/${loc.id}/report-verification/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: selectedDecision, note: decisionNote }),
    });
    setIsSaving(false);
    if (!response.ok) {
      toast.error("Gagal menyimpan keputusan review");
      return;
    }
    toast.success(`Laporan ditandai ${DECISION_LABELS[selectedDecision]}.`);
    queryClient.invalidateQueries({ queryKey });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#efe2d4] px-6 py-4.5">
          <div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Review Laporan Verifikasi Lapangan — {label}</div>
            <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
              {loc.address}
              {loc.city ? `, ${loc.city}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-[#a68f80] hover:bg-[#f2ece5]"
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex w-[480px] shrink-0 flex-col gap-3 overflow-y-auto">
            {REPORT_CHECKLIST_SECTIONS.map((section) => (
              <div key={section.key} className="rounded-lg border border-[#efe2d4] p-3.5">
                <div className="text-[13px] font-extrabold text-[#20180f]">{section.title}</div>
                <div className="mt-1 text-[11px] text-[#8a7565]">{section.description}</div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {section.items.map((item) => (
                    <ReportChecklistItemRow
                      key={item.id}
                      item={item}
                      value={state?.items[item.id] ?? null}
                      sourceValue={item.getValue?.(context)}
                      disabled={isSaving}
                      onSelect={(result) => saveItemPatch(item.id, { result })}
                      onNoteBlur={(note) => saveItemPatch(item.id, { note: note.trim() || null })}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-[#efe2d4] p-3.5">
              <div className="mb-3 text-[12.5px] font-bold text-[#20180f]">Catatan Keputusan</div>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                rows={3}
                placeholder="Catatan keputusan (opsional)..."
                disabled={isSaving}
                className="mb-3 w-full resize-none rounded-lg border border-[#e8dccd] bg-[#faf7f4] p-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f2ece5]"
              />
              <div className="flex flex-col gap-2">
                {(["VERIFIED", "REJECTED", "REVISION"] as ReportDecisionValue[]).map((decision) => (
                  <button
                    key={decision}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setSelectedDecision(decision)}
                    className={
                      "rounded-lg border px-3 py-2 text-[12.5px] font-bold disabled:opacity-50 " +
                      (selectedDecision === decision
                        ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]"
                        : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                    }
                  >
                    {DECISION_LABELS[decision]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={isSaving || !selectedDecision}
                onClick={handleSubmit}
                className="mt-3 w-full rounded-lg bg-[#16a34a] py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
              >
                Submit
              </button>
              {state?.verifiedAt && (
                <div className="mt-3 text-[10.5px] text-[#8a7565]">
                  Direview: {state.verifiedByName} — {new Date(state.verifiedAt).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-lg border border-[#efe2d4] bg-white p-4">
            <ReportRouter assignmentId={assignmentId} locationId={loc.id} basePath="/api/verifikator-workspace" />
          </div>
        </div>
      </div>
    </div>
  );
}
