"use client";

import { useQuery } from "@tanstack/react-query";

import {
  APPLICANT_BRAND_ROLE_LABELS,
  IMPORT_APPOINTMENT_SOURCE_LABELS,
  BRAND_APPLICATION_READINESS_LABELS,
} from "../business-rules";
import {
  konsumsiProductTotal,
  type ApplicationKonsumsiProductValues,
  type KonsumsiFinancialDocumentValues,
} from "../schema";
import { terbilangRupiah } from "@/lib/terbilang";
import { MODAL_STATEMENT_LETTER_DOC_DEF, NON_INDUSTRI_SUPPORT_DOC_DEFS } from "../../../financial-capability-defs";
import type { ApplicationWizardValues } from "../../../schema";

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

  if (
    payload.applicationBrands.length === 0 &&
    payload.brandQualityTests.length === 0 &&
    payload.konsumsiDocuments.length === 0 &&
    payload.konsumsiProducts.length === 0 &&
    (payload.konsumsiFinancialDocuments ?? []).every((doc) => !doc.enabled && !doc.documentPath && !doc.amount)
  ) {
    return null;
  }

  // Group by Brand, then by Sub Kelompok Komoditas — same structure Step "Product Information"
  // itself uses. Submitted applications show the server-built `productSnapshot` (never live
  // master data); drafts have no snapshot yet, so they fall back to the display caches captured
  // at selection time (commodityName/hsDescription/countryOfOriginCode on the product itself).
  const productsByBrand = new Map<string, ApplicationKonsumsiProductValues[]>();
  for (const product of payload.konsumsiProducts) {
    productsByBrand.set(product.brandId, [...(productsByBrand.get(product.brandId) ?? []), product]);
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

      <Section title="VIU Konsumsi — Dokumen Pendukung Merek">
        <div className="flex flex-col gap-3">
          {payload.brandQualityTests.map((qt, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Item label="Merek" value={snapshotOrFallbackBrandName(payload, qt.brandId, fallbackBrandName)} />
                <Item label="Kelompok Komoditas" value={qt.industryName} />
                <Item label="Sub Kelompok Komoditas" value={qt.commodityName} />
                <Item label="Nomor Sertifikat" value={qt.certificateNumber} />
                <Item label="Laboratorium" value={qt.laboratoryName} />
                <Item label="Tanggal Terbit" value={formatDate(qt.issueDate)} />
                <Item label="Tanggal Kadaluarsa" value={qt.expiryDate ? formatDate(qt.expiryDate) : "—"} />
              </dl>
              <div className="mt-2 flex flex-wrap gap-2">
                {qt.filePath && (
                  <a
                    href={`/${qt.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                  >
                    {qt.fileName || "Hasil Uji Mutu"}
                  </a>
                )}
                {qt.labelStatementFilePath && (
                  <a
                    href={`/${qt.labelStatementFilePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                  >
                    {qt.labelStatementFileName || "Surat Pernyataan Label Berbahasa Indonesia"}
                  </a>
                )}
                {qt.labelDocumentationFilePath && (
                  <a
                    href={`/${qt.labelDocumentationFilePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                  >
                    {qt.labelDocumentationFileName || "Dokumentasi Label Produk"}
                  </a>
                )}
              </div>
            </div>
          ))}
          {payload.brandQualityTests.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada dokumen pendukung merek pada permohonan ini.</p>
          )}
        </div>
      </Section>

      <Section title="VIU Konsumsi — Bukti Kemampuan Finansial">
        <div className="flex flex-col gap-4">
          <FinancialCapabilitySummary documents={payload.konsumsiFinancialDocuments ?? []} />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dokumen Impor Barang Konsumsi
            </p>
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
          </div>
        </div>
      </Section>

      <Section title="VIU Konsumsi — Informasi Produk">
        <div className="flex flex-col gap-4">
          {payload.applicationBrands.map((brandEntry) => {
            const brandProducts = productsByBrand.get(brandEntry.brandId) ?? [];
            if (brandProducts.length === 0) return null;

            const groups = new Map<string, ApplicationKonsumsiProductValues[]>();
            for (const product of brandProducts) {
              groups.set(product.commodityGroupId, [...(groups.get(product.commodityGroupId) ?? []), product]);
            }

            return (
              <div key={brandEntry.brandId} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">
                  {brandEntry.submissionSnapshot?.brandName ?? fallbackBrandName(brandEntry.brandId) ?? brandEntry.brandId}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {[...groups.entries()].map(([commodityGroupId, products]) => (
                    <div key={commodityGroupId} className="rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Kelompok Komoditas
                      </p>
                      <p className="text-sm font-bold">
                        {products[0].productSnapshot?.industryName ?? products[0].industryName ?? "—"}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Sub Kelompok Komoditas
                      </p>
                      <p className="text-sm font-bold">
                        {products[0].productSnapshot?.commodityName ?? products[0].commodityName ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-col gap-3">
                        {products.map((product) => (
                          <dl key={product.id} className="grid gap-x-6 gap-y-2 border-t border-border pt-2 sm:grid-cols-2">
                            <Item label="Nama Produk" value={product.productName} />
                            <Item label="HS Code" value={product.hsCode} />
                            <Item label="Uraian HS" value={product.productSnapshot?.hsDescription ?? product.hsDescription} />
                            <Item
                              label="Asal Negara"
                              value={product.productSnapshot?.countryOfOriginName ?? product.countryOfOrigin}
                            />
                            <Item label="Jumlah Permohonan" value={`${Number(product.quantity).toLocaleString("id-ID")} ${product.unit ?? ""}`} />
                            <Item label="Jumlah Stock" value={`${Number(product.stockQuantity ?? 0).toLocaleString("id-ID")} ${product.unit ?? ""}`} />
                            <Item label="Harga Satuan Rata-rata" value={`${product.currency} ${formatMoney(Number(product.averageUnitPrice))}`} />
                            <Item
                              label="Total Harga"
                              value={
                                product.productSnapshot?.totalPrice
                                  ? `${product.currency} ${formatMoney(Number(product.productSnapshot.totalPrice))}`
                                  : `${product.currency} ${formatMoney(konsumsiProductTotal(product))}`
                              }
                            />
                          </dl>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {payload.konsumsiProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada produk pada permohonan ini.</p>
          )}
        </div>
      </Section>
    </>
  );
}

/** Step "Bukti Kemampuan Finansial" (support-document, shared with Industri/Non-Industri —
 * see Step5SupportDocument's `needsModalDocs`) — Surat Pernyataan Kepemilikan Modal Kerja
 * (always required, carries the Jumlah Modal Kerja amount + its terbilang) plus whichever single
 * evidence document (from NON_INDUSTRI_SUPPORT_DOC_DEFS) the applicant picked. */
function FinancialCapabilitySummary({ documents }: { documents: KonsumsiFinancialDocumentValues[] }) {
  const statementEntry = documents.find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
  const evidenceEntry = documents.find((doc) => doc.enabled && doc.key !== MODAL_STATEMENT_LETTER_DOC_DEF.key);
  const evidenceDef = evidenceEntry ? NON_INDUSTRI_SUPPORT_DOC_DEFS.find((def) => def.key === evidenceEntry.key) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">{MODAL_STATEMENT_LETTER_DOC_DEF.title}</p>
        <dl className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Item
            label="Jumlah Modal Kerja"
            value={statementEntry?.amount ? `Rp ${formatMoney(Number(statementEntry.amount))}` : null}
          />
          <Item label="Terbilang" value={statementEntry?.amount ? terbilangRupiah(statementEntry.amount) : null} />
        </dl>
        {statementEntry?.documentPath && (
          <a
            href={`/${statementEntry.documentPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
          >
            Dokumen Surat Pernyataan
          </a>
        )}
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">Dokumen Bukti Pernyataan Modal</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{evidenceDef?.title ?? "Belum dipilih"}</p>
        {evidenceEntry?.documentPath && (
          <a
            href={`/${evidenceEntry.documentPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-primary hover:underline"
          >
            {evidenceDef?.title ?? "Dokumen Bukti"}
          </a>
        )}
      </div>
    </div>
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
