"use client";

import { useQuery } from "@tanstack/react-query";

import {
  APPLICANT_BRAND_ROLE_LABELS,
  IMPORT_APPOINTMENT_SOURCE_LABELS,
  BRAND_APPLICATION_READINESS_LABELS,
} from "../business-rules";
import type { ApplicationWizardValues } from "../../../schema";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  payload: ApplicationWizardValues;
  /** `/api/merk` (admin) or `/api/company-workspace/brands` (company) — only
   * used as a fallback live lookup for brand entries that predate the
   * submission-snapshot feature (legacy submitted applications). Never used
   * to override a snapshot that already exists. */
  brandLookupApiBase: string;
};

/**
 * Read-only admin review of a submitted (or draft) VIU Konsumsi application's
 * own data — composed into `ApplicationDetail`, which only decides *whether*
 * to render this (`importTypes.includes("BARANG_KONSUMSI")`), never *what*
 * it shows. For a submitted application, each brand entry's own
 * `submissionSnapshot` (server-built at final submit, see
 * `konsumsi/server/validate-submit.ts`) is the primary source — never
 * current live Brand Master data, which may have changed since submission.
 * Legacy applications submitted before the snapshot feature existed have no
 * `submissionSnapshot`; those fall back to a live Brand Master lookup,
 * clearly labeled as such rather than silently passed off as historical.
 */
export function KonsumsiApplicationReview({ payload, brandLookupApiBase }: Props) {
  const brandsNeedingFallback = payload.applicationBrands.filter((entry) => !entry.submissionSnapshot);

  const { data: fallbackBrands } = useQuery({
    queryKey: ["applications", "konsumsi-review-fallback", brandLookupApiBase, brandsNeedingFallback.map((e) => e.brandId)],
    queryFn: async () => {
      const response = await fetch(brandLookupApiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: { id: string; brandName: string }[] };
      return json.data;
    },
    enabled: brandsNeedingFallback.length > 0,
  });
  const fallbackBrandName = (brandId: string) => fallbackBrands?.find((b) => b.id === brandId)?.brandName;

  if (payload.applicationBrands.length === 0 && payload.brandQualityTests.length === 0 && payload.konsumsiDocuments.length === 0) {
    return null;
  }

  return (
    <>
      <Section title="VIU Konsumsi — Merek yang Digunakan">
        <div className="flex flex-col gap-4">
          {payload.applicationBrands.map((entry, index) => {
            const snapshot = entry.submissionSnapshot;
            return (
              <div key={`${entry.brandId}-${index}`} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {snapshot?.brandName ?? fallbackBrandName(entry.brandId) ?? entry.brandId}
                  </p>
                  {!snapshot && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Data merek saat ini (snapshot historis tidak tersedia)
                    </span>
                  )}
                </div>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Item label="Pemilik Merek" value={snapshot?.brandOwnerName} />
                  <Item
                    label="Kedudukan Pemilik"
                    value={snapshot?.ownerLocation === "domestic" ? "Indonesia" : snapshot?.ownerLocation === "foreign" ? "Luar Negeri" : null}
                  />
                  <Item label="Bukti Merek" value={snapshot?.trademarkEvidenceType} />
                  <Item label="Nomor Pendaftaran" value={snapshot?.registrationNumber} />
                  <Item label="Kelas Merek" value={snapshot?.trademarkClass} />
                  <Item label="Tanggal Pendaftaran" value={snapshot ? formatDate(snapshot.registrationDate) : undefined} />
                  <Item label="Peran Pemohon" value={APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole]} />
                  <Item
                    label="Sumber Penunjukan"
                    value={entry.appointmentSource ? IMPORT_APPOINTMENT_SOURCE_LABELS[entry.appointmentSource] : null}
                  />
                  <Item label="Perwakilan Resmi" value={snapshot?.officialRepresentativeName} />
                  <Item
                    label="Kesiapan Saat Submit"
                    value={snapshot ? BRAND_APPLICATION_READINESS_LABELS[snapshot.readinessAtSubmission] : null}
                  />
                </dl>
                {snapshot && snapshot.requiredDocumentLabels.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dokumen wajib saat submit: {snapshot.requiredDocumentLabels.join(", ")}
                  </p>
                )}
                {Object.keys(entry.relationshipDocuments ?? {}).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(entry.relationshipDocuments ?? {}).map(([code, doc]) => (
                      <a
                        key={code}
                        href={`/${doc.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                      >
                        {doc.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {payload.applicationBrands.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada merek pada permohonan ini.</p>
          )}
        </div>
      </Section>

      <Section title="VIU Konsumsi — Hasil Uji Mutu">
        <div className="flex flex-col gap-3">
          {payload.brandQualityTests.map((qt, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Item label="Merek" value={snapshotOrFallbackBrandName(payload, qt.brandId, fallbackBrandName)} />
                <Item label="Komoditas" value={qt.commodityName} />
                <Item label="Nomor Sertifikat" value={qt.certificateNumber} />
                <Item label="Laboratorium" value={qt.laboratoryName} />
                <Item label="Tanggal Terbit" value={formatDate(qt.issueDate)} />
                <Item label="Tanggal Kadaluarsa" value={qt.expiryDate ? formatDate(qt.expiryDate) : "—"} />
              </dl>
              {qt.filePath && (
                <a
                  href={`/${qt.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {qt.fileName || "Lihat dokumen"}
                </a>
              )}
            </div>
          ))}
          {payload.brandQualityTests.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada hasil uji mutu pada permohonan ini.</p>
          )}
        </div>
      </Section>

      <Section title="VIU Konsumsi — Dokumen Pendukung">
        <div className="flex flex-col gap-2">
          {payload.konsumsiDocuments.map((doc) => (
            <a
              key={doc.id}
              href={`/${doc.documentPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              {doc.label}
            </a>
          ))}
          {payload.konsumsiDocuments.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada dokumen pendukung pada permohonan ini.</p>
          )}
        </div>
      </Section>
    </>
  );
}

function snapshotOrFallbackBrandName(
  payload: ApplicationWizardValues,
  brandId: string,
  fallbackBrandName: (brandId: string) => string | undefined,
): string {
  const entry = payload.applicationBrands.find((b) => b.brandId === brandId);
  return entry?.submissionSnapshot?.brandName ?? fallbackBrandName(brandId) ?? brandId;
}
