"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { LOCATION_TYPE_ICON, LOCATION_TYPE_LABELS } from "../../status";
import { computeFindings as computeOfficeFindings, type OfficeVerificationValues } from "../office-verification/schema";
import { computeFindings as computeFieldFindings, type FieldVerificationValues } from "../field-verification/schema";

const LOCATION_TYPE_IMAGE: Record<string, string> = {
  KANTOR: "/images/locations/kantor.svg",
  GUDANG: "/images/locations/gudang.svg",
  PABRIK: "/images/locations/pabrik.svg",
};

type LocationVisitItem = {
  id: string;
  locationType: string;
  address: string;
  city: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progress: number;
  officeVerification: OfficeVerificationValues | null;
  warehouseVerification: FieldVerificationValues | null;
  factoryVerification: FieldVerificationValues | null;
  reportVerification: { decision: "VERIFIED" | "REJECTED" | "REVISION" | null; decisionNote: string | null } | null;
};

type Props = { assignmentId: string };

const CARD_META: Record<
  LocationVisitItem["status"] | "COMPLETED_REVISION",
  { badgeBg: string; badgeColor: string; badgeIcon: string; badgeLabel: string; accent: string }
> = {
  COMPLETED: { badgeBg: "#e2f7ea", badgeColor: "#027a48", badgeIcon: "check_circle", badgeLabel: "Completed", accent: "#027a48" },
  COMPLETED_REVISION: { badgeBg: "#fbe2e0", badgeColor: "#ba1a1a", badgeIcon: "error", badgeLabel: "Completed", accent: "#ba1a1a" },
  IN_PROGRESS: { badgeBg: "#fdedd6", badgeColor: "#c1440e", badgeIcon: "schedule", badgeLabel: "On Progress", accent: "#e0662e" },
  NOT_STARTED: { badgeBg: "#f2f0ee", badgeColor: "#6b6259", badgeIcon: "", badgeLabel: "Not Started", accent: "transparent" },
};

export function OnSiteTab({ assignmentId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", assignmentId, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations`);
      if (!response.ok) throw new Error("Gagal memuat lokasi");
      const json = (await response.json()) as { data: LocationVisitItem[] };
      return json.data;
    },
  });

  const startMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal memulai verifikasi lokasi");
      }
      return response.json();
    },
    onSuccess: (_result, locationId) => {
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
      router.push(`/surveyor-workspace/assignments/${assignmentId}/verify/${locationId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memulai verifikasi lokasi");
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revise" }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal membuka revisi lokasi");
      }
      return response.json();
    },
    onSuccess: (_result, locationId) => {
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
      router.push(`/surveyor-workspace/assignments/${assignmentId}/verify/${locationId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal membuka revisi lokasi");
    },
  });

  const locations = data ?? [];
  const completedCount = locations.filter((l) => l.status === "COMPLETED").length;
  const overallPct = locations.length > 0 ? Math.round((completedCount / locations.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-[#ffe6dc] px-7 py-6">
        <div>
          <h3 className="mb-1.5 font-sv-headline-lg text-xl font-extrabold">On Site Verification</h3>
          <div className="flex items-center gap-1.5 text-[13.5px] text-[#7a4130]">
            <MaterialIcon name="info" className="text-base" />
            Complete on-site checklists for each identified facility location.
          </div>
        </div>
        <div className="min-w-[220px] rounded-[10px] bg-white p-3.5">
          <div className="mb-2 flex justify-between text-[12.5px] text-[#594138]">
            <span>Overall Progress</span>
            <span className="font-bold text-[#261813]">
              {completedCount} / {locations.length} Locations
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#f5ddd2]">
            <div className="h-full rounded-full bg-[#c1440e]" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
      {!isLoading && locations.length === 0 && (
        <p className="text-sm text-[#8a7565]">Belum ada lokasi terdaftar untuk aplikasi ini.</p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => {
          const label = LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType;
          const isCompleted = loc.status === "COMPLETED";
          const isInProgress = loc.status === "IN_PROGRESS";
          const fieldKind = loc.locationType === "GUDANG" ? "GUDANG" : loc.locationType === "PABRIK" ? "PABRIK" : null;
          const fieldVerification = fieldKind === "GUDANG" ? loc.warehouseVerification : fieldKind === "PABRIK" ? loc.factoryVerification : null;
          const isOffice = loc.locationType === "KANTOR" && loc.officeVerification;
          const isField = fieldKind !== null && fieldVerification !== null;
          const findings = isOffice
            ? computeOfficeFindings(loc.officeVerification!)
            : isField
              ? computeFieldFindings(fieldKind!, fieldVerification!)
              : [];
          const verifikatorRequestedRevision = loc.reportVerification?.decision === "REVISION";
          const needsRevision = isCompleted && (findings.length > 0 || verifikatorRequestedRevision);
          const meta = needsRevision ? CARD_META.COMPLETED_REVISION : CARD_META[loc.status];

          return (
            <div key={loc.id} className="flex flex-col overflow-hidden rounded-[14px] border border-[#e8d5c5] bg-white">
              <div className="relative h-[130px] overflow-hidden bg-gradient-to-br from-[#e9e6e3] to-[#d8d4d0]">
                {LOCATION_TYPE_IMAGE[loc.locationType] ? (
                  <Image
                    src={LOCATION_TYPE_IMAGE[loc.locationType]}
                    alt={label}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <MaterialIcon name={LOCATION_TYPE_ICON[loc.locationType] ?? "place"} className="text-[44px] text-[#e8c3b3]" />
                  </div>
                )}
                <span
                  className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: meta.badgeBg, color: meta.badgeColor }}
                >
                  {meta.badgeIcon && <MaterialIcon name={meta.badgeIcon} className="text-[13px]" />}
                  {meta.badgeLabel}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5" style={{ borderTop: `4px solid ${meta.accent}` }}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="text-[15.5px] font-bold">{label}</div>
                  <MaterialIcon name={LOCATION_TYPE_ICON[loc.locationType] ?? "place"} className="text-[#a68f80]" />
                </div>
                <div className="mb-3 text-[12.5px] leading-relaxed text-[#8a7565]">
                  {loc.address}
                  {loc.city ? `, ${loc.city}` : ""}
                </div>

                {isInProgress && (
                  <>
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[#f5ddd2]">
                      <div className="h-full rounded-full bg-[#e0662e]" style={{ width: `${loc.progress}%` }} />
                    </div>
                    <div className="mb-3.5 text-[11.5px] text-[#8a7565]">
                      {loc.progress}% of checklist items verified
                    </div>
                  </>
                )}

                {verifikatorRequestedRevision && (
                  <div className="mb-3 rounded-[8px] bg-[#fbe2e0] px-3 py-2 text-[11.5px] leading-relaxed text-[#8a2c25]">
                    <span className="font-bold">Diminta revisi oleh verifikator.</span>
                    {loc.reportVerification?.decisionNote ? ` ${loc.reportVerification.decisionNote}` : ""}
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  {isCompleted ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            ["KANTOR", "GUDANG", "PABRIK"].includes(loc.locationType)
                              ? `/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}/report`
                              : `/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}`,
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-[9px] border border-[#e1bfb3] bg-white py-2.5 text-[13px] font-bold"
                      >
                        <MaterialIcon name="description" className="text-base" />
                        View Report
                      </button>
                      {needsRevision && (
                        <button
                          type="button"
                          disabled={reviseMutation.isPending}
                          onClick={() => reviseMutation.mutate(loc.id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-[9px] bg-[#ba1a1a] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                        >
                          <MaterialIcon name="rate_review" className="text-base" />
                          Revisi
                        </button>
                      )}
                    </>
                  ) : isInProgress ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}`)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-[9px] bg-[#e0662e] py-2.5 text-[13px] font-bold text-white"
                      >
                        <MaterialIcon name="play_arrow" className="text-base" />
                        Resume Verification
                      </button>
                      {["KANTOR", "GUDANG", "PABRIK"].includes(loc.locationType) && (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(`/surveyor-workspace/assignments/${assignmentId}/verify/${loc.id}/report`, "_blank")
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-[9px] border border-[#e1bfb3] bg-white py-2.5 text-[13px] font-bold"
                        >
                          <MaterialIcon name="description" className="text-base" />
                          Generate Report
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={startMutation.isPending}
                      onClick={() => startMutation.mutate(loc.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-[9px] border-[1.5px] border-sv-primary-container bg-[#fff8f6] py-2.5 text-[13px] font-bold text-sv-primary-container disabled:opacity-60"
                    >
                      <MaterialIcon name="edit_note" className="text-base" />
                      Start Verification
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
