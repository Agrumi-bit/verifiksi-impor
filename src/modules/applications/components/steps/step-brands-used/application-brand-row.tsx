"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioCardGroup } from "@/modules/merk/components/steps/step2/radio-card-group";
import { CompanySearchSelect } from "@/modules/merk/components/steps/step2/company-search-select";
import { useActiveBrandOwners } from "@/modules/master-data/use-active-brand-owners";
import { MERK_EVIDENCE_TYPE_LABELS } from "@/modules/merk/schema";
import {
  APPLICANT_BRAND_ROLES,
  APPLICANT_BRAND_ROLE_LABELS,
  IMPORT_APPOINTMENT_SOURCES,
  IMPORT_APPOINTMENT_SOURCE_LABELS,
  BRAND_APPLICATION_READINESS_LABELS,
  DOCUMENT_DISPLAY_STATE_LABELS,
  getDocumentDisplayState,
  type ApplicantBrandRole,
  type ImportAppointmentSource,
} from "../../../viu-brand-relationship-rules";
import { useBrandApplicationDetail } from "../../../hooks/use-brand-application-detail";
import type { ApplicationWizardValues } from "../../../schema";

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

const READINESS_PILL_CLASS: Record<string, string> = {
  READY: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INCOMPLETE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  NOT_ELIGIBLE: "bg-destructive/10 text-destructive",
};

const DOC_STATE_PILL_CLASS: Record<string, string> = {
  TERSEDIA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  BELUM_TERSEDIA: "bg-destructive/10 text-destructive",
  DIKECUALIKAN: "bg-muted text-muted-foreground",
  TIDAK_BERLAKU: "bg-muted text-muted-foreground",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  index: number;
  apiBase: string;
  brandDetailHrefBase: string;
  defaultExpanded?: boolean;
  onRemoved: () => void;
};

/**
 * One row = one Brand used in this application. Combines the table row and
 * its expandable relationship-configuration panel in a single component
 * since they share the same brand-detail fetch and rule-engine result —
 * splitting them would just mean threading the same data through props
 * twice. The rule engine itself (viu-brand-relationship-rules.ts) stays a
 * plain function this component only calls, never reimplements.
 */
export function ApplicationBrandRow({ form, index, apiBase, brandDetailHrefBase, defaultExpanded, onRemoved }: Props) {
  const { setValue, watch, formState } = form;
  const entry = watch(`applicationBrands.${index}`);
  const entryErrors = formState.errors.applicationBrands?.[index];
  const [isExpanded, setIsExpanded] = useState(Boolean(defaultExpanded));
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const { options: brandOwnerOptions } = useActiveBrandOwners();

  const { brand, ownerLocation, ownerTitle, requirements, isLoading, isError } = useBrandApplicationDetail(
    apiBase,
    entry.brandId,
    {
      applicantRole: entry.applicantRole ?? null,
      appointmentSource: entry.appointmentSource ?? null,
      officialRepresentativeCompanyId: entry.officialRepresentativeCompanyId ?? null,
    },
  );

  function setRole(role: ApplicantBrandRole) {
    setValue(`applicationBrands.${index}.applicantRole`, role, { shouldValidate: true, shouldDirty: true });
    setValue(`applicationBrands.${index}.appointmentSource`, undefined, { shouldDirty: true });
    setValue(`applicationBrands.${index}.officialRepresentativeCompanyId`, undefined, { shouldDirty: true });
  }

  function setAppointmentSource(source: ImportAppointmentSource) {
    setValue(`applicationBrands.${index}.appointmentSource`, source, { shouldValidate: true, shouldDirty: true });
    if (source === "BRAND_OWNER") {
      setValue(`applicationBrands.${index}.officialRepresentativeCompanyId`, undefined, { shouldDirty: true });
    }
  }

  if (isLoading) {
    return (
      <tr className="border-t border-border">
        <td colSpan={8} className="px-4 py-4 text-sm text-muted-foreground">
          Memuat detail merek...
        </td>
      </tr>
    );
  }

  if (isError || !brand) {
    return (
      <tr className="border-t border-border">
        <td colSpan={8} className="px-4 py-4 text-sm text-destructive">
          Gagal memuat detail merek ini. Pastikan database sudah terhubung.
        </td>
      </tr>
    );
  }

  const readiness = requirements?.readiness ?? "NOT_ELIGIBLE";
  const requiredCount = requirements?.requiredDocumentCount ?? 0;
  const availableCount = requirements?.availableRequiredDocumentCount ?? 0;
  const isDomestic = ownerLocation === "domestic";
  const applicantCompanyName = watch("companyName");
  const selectedRepresentativeName = brandOwnerOptions.find(
    (o) => o.value === entry.officialRepresentativeCompanyId,
  )?.label;
  // "Perwakilan Resmi" column: the applicant itself when it IS the
  // representative; the selected Official Representative company when the
  // applicant is only an importer appointed by one; blank when appointed
  // directly by the Brand Owner (no representative in that chain).
  const representativeColumnValue =
    entry.applicantRole === "OFFICIAL_REPRESENTATIVE"
      ? applicantCompanyName || APIU_PLACEHOLDER_NAME
      : entry.applicantRole === "IMPORTER_ONLY" && entry.appointmentSource === "OFFICIAL_REPRESENTATIVE"
        ? (selectedRepresentativeName ?? "Belum dipilih")
        : "—";

  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="px-4 py-3.5">
          <p className="text-sm font-bold">{brand.brandName}</p>
          <p className="text-xs text-muted-foreground">{ownerLocation === "domestic" ? "Indonesia" : "Luar Negeri"}</p>
        </td>
        <td className="px-4 py-3.5 text-sm">{ownerTitle || "—"}</td>
        <td className="px-4 py-3.5 text-sm">
          {brand.certificateType ? MERK_EVIDENCE_TYPE_LABELS[brand.certificateType] : "—"}
        </td>
        <td className="px-4 py-3.5 text-sm">
          {entry.applicantRole ? APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole] : "Belum ditentukan"}
        </td>
        <td className="px-4 py-3.5 text-sm">{representativeColumnValue}</td>
        <td className="px-4 py-3.5 text-sm">
          {requirements ? `${availableCount} / ${requiredCount}` : "—"}
        </td>
        <td className="px-4 py-3.5">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${READINESS_PILL_CLASS[readiness]}`}>
            {BRAND_APPLICATION_READINESS_LABELS[readiness]}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded((v) => !v)}>
              {isExpanded ? "Sembunyikan" : "Ubah Hubungan"}
              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
            <a
              href={`${brandDetailHrefBase}/${brand.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat di Brand Management
            </a>
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setIsRemoveConfirmOpen(true)}>
              Hapus
            </Button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t border-dashed border-border bg-muted/20">
          <td colSpan={8} className="px-4 py-4">
            <div className="flex flex-col gap-4">
              {/* Trademark Evidence Summary */}
              <section className="rounded-lg border border-border bg-background p-3.5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Bukti Merek</p>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Jenis Bukti</dt>
                    <dd className="font-semibold">{brand.certificateType ? MERK_EVIDENCE_TYPE_LABELS[brand.certificateType] : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tanggal Registrasi / Notifikasi</dt>
                    <dd className="font-semibold">{formatDate(brand.registrationDate)}</dd>
                  </div>
                  {requirements?.evidenceValidity.status !== "NOT_APPLICABLE" && (
                    <>
                      <div>
                        <dt className="text-muted-foreground">Batas Penggunaan</dt>
                        <dd className="font-semibold">{formatDate(requirements?.evidenceValidity.expiryDate ?? null)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Sisa Hari</dt>
                        <dd className="font-semibold">
                          {requirements?.evidenceValidity.daysRemaining !== null && requirements?.evidenceValidity.daysRemaining !== undefined
                            ? `${requirements.evidenceValidity.daysRemaining} hari`
                            : "—"}
                        </dd>
                      </div>
                    </>
                  )}
                </div>
                {requirements?.evidenceValidity.status === "EXPIRED_9_MONTH_LIMIT" && (
                  <p className="mt-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                    Tanda pendaftaran merek telah melewati batas penggunaan 9 bulan dan tidak dapat digunakan
                    sebagai pengganti Sertifikat Merek.
                  </p>
                )}
              </section>

              {/* Applicant Role Selector */}
              <section>
                <p className="mb-2 text-sm font-semibold">
                  Peran Perusahaan Pemohon terhadap Merek <span className="text-destructive">*</span>
                </p>
                <RadioCardGroup
                  value={entry.applicantRole}
                  onChange={setRole}
                  columns={2}
                  options={APPLICANT_BRAND_ROLES.map((value) => ({ value, label: APPLICANT_BRAND_ROLE_LABELS[value] }))}
                />
                {entryErrors?.applicantRole?.message && (
                  <p className="mt-1.5 text-xs text-destructive">{entryErrors.applicantRole.message}</p>
                )}
              </section>

              {entry.applicantRole === "IMPORTER_ONLY" && (
                <section>
                  <p className="mb-2 text-sm font-semibold">
                    Penunjukan Importir Berasal Dari <span className="text-destructive">*</span>
                  </p>
                  <RadioCardGroup
                    value={entry.appointmentSource}
                    onChange={setAppointmentSource}
                    columns={2}
                    options={IMPORT_APPOINTMENT_SOURCES.map((value) => ({
                      value,
                      label: IMPORT_APPOINTMENT_SOURCE_LABELS[value],
                      description:
                        value === "BRAND_OWNER" && !isDomestic
                          ? "Hanya berlaku apabila pemilik merek berkedudukan di Indonesia."
                          : undefined,
                    }))}
                  />
                  {entry.appointmentSource === "BRAND_OWNER" && !isDomestic && (
                    <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                      Penunjukan langsung dari pemilik merek hanya dapat digunakan apabila pemilik merek
                      berkedudukan di Indonesia.
                    </p>
                  )}
                  {entry.appointmentSource === "BRAND_OWNER" && isDomestic && (
                    <p className="mt-2 text-xs text-muted-foreground">Pemberi Penunjukan: {ownerTitle || "Pemilik Merek"} (read-only)</p>
                  )}
                  {entryErrors?.appointmentSource?.message && (
                    <p className="mt-1.5 text-xs text-destructive">{entryErrors.appointmentSource.message}</p>
                  )}
                </section>
              )}

              {entry.appointmentSource === "OFFICIAL_REPRESENTATIVE" && (
                <section>
                  <CompanySearchSelect
                    label="Perwakilan Resmi"
                    required
                    error={entryErrors?.officialRepresentativeCompanyId?.message}
                    value={entry.officialRepresentativeCompanyId}
                    onChange={(value) =>
                      setValue(`applicationBrands.${index}.officialRepresentativeCompanyId`, value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </section>
              )}

              {entry.applicantRole === "OFFICIAL_REPRESENTATIVE" && (
                <section className="rounded-lg border border-border bg-background p-3.5 text-xs text-muted-foreground">
                  Perusahaan Pemohon (Perwakilan Resmi): <span className="font-semibold text-foreground">{watch("companyName") || "—"}</span>
                </section>
              )}

              {/* Relationship Summary */}
              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Struktur Hubungan</p>
                <RelationshipChain
                  ownerTitle={ownerTitle}
                  ownerLocation={ownerLocation}
                  applicantRole={entry.applicantRole}
                  appointmentSource={entry.appointmentSource}
                  representativeName={selectedRepresentativeName}
                  applicantCompanyName={applicantCompanyName}
                />
              </section>

              {/* Required Document Checklist */}
              {requirements && requirements.requirements.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dokumen Hubungan</p>
                    <p className="text-xs text-muted-foreground">
                      {availableCount} / {requiredCount} Dokumen Wajib Lengkap
                      {requirements.exemptDocumentCount > 0 && ` · ${requirements.exemptDocumentCount} dokumen dikecualikan`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {requirements.requirements.map((item) => {
                      const state = getDocumentDisplayState(item);
                      return (
                        <div key={item.code} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                          <span className="text-xs font-medium">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DOC_STATE_PILL_CLASS[state]}`}>
                              {DOCUMENT_DISPLAY_STATE_LABELS[state]}
                            </span>
                            {state === "BELUM_TERSEDIA" && (
                              <a
                                href={`${brandDetailHrefBase}/${brand.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                Lengkapi Dokumen
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {requirements?.relationshipIssue && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {requirements.relationshipIssue}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}

      <Dialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Merek dari Permohonan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Merek <span className="font-semibold text-foreground">{brand.brandName}</span> hanya akan dihapus dari
            permohonan ini. Data Brand Master tidak akan dihapus.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRemoveConfirmOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={onRemoved}>
              Ya, Hapus dari Permohonan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RelationshipChain({
  ownerTitle,
  ownerLocation,
  applicantRole,
  appointmentSource,
  representativeName,
  applicantCompanyName,
}: {
  ownerTitle: string | null;
  ownerLocation: "domestic" | "foreign" | null;
  applicantRole: ApplicantBrandRole | undefined;
  appointmentSource: ImportAppointmentSource | undefined;
  representativeName?: string;
  applicantCompanyName?: string;
}) {
  const nodes: { title: string; subtitle: string }[] = [
    { title: ownerTitle || "Pemilik Merek", subtitle: `Pemilik Merek · ${ownerLocation === "domestic" ? "Indonesia" : "Luar Negeri"}` },
  ];

  if (applicantRole === "OFFICIAL_REPRESENTATIVE") {
    nodes.push({ title: applicantCompanyName || APIU_PLACEHOLDER_NAME, subtitle: "Perwakilan Resmi / API-U" });
  } else if (applicantRole === "IMPORTER_ONLY") {
    if (appointmentSource === "OFFICIAL_REPRESENTATIVE") {
      nodes.push({ title: representativeName || "Perwakilan resmi belum dipilih", subtitle: "Perwakilan Resmi" });
    }
    nodes.push({ title: applicantCompanyName || APIU_PLACEHOLDER_NAME, subtitle: "API-U / Importir" });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3.5">
      {nodes.map((node, index) => (
        <div key={index}>
          <div className="rounded-lg border border-border bg-background px-3.5 py-2.5">
            <p className="text-sm font-bold">{node.title}</p>
            <p className="text-xs text-muted-foreground">{node.subtitle}</p>
          </div>
          {index < nodes.length - 1 && (
            <div className="flex items-center gap-2 pl-3.5 py-1 text-xs text-muted-foreground">↓</div>
          )}
        </div>
      ))}
    </div>
  );
}
