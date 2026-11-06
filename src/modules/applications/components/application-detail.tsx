"use client";

import { ApplicationLocationsPanel } from "@/modules/applications/components/application-locations-panel";
import type { ApplicationLocationSummary } from "@/modules/shared/location-meta";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApplicationWizardValues } from "../schema";
import { KonsumsiApplicationReview } from "../viu-schemes/konsumsi/components/konsumsi-application-review";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ReturnForRevisionDialog } from "./return-for-revision-dialog";
import { ApplicationAuditHistory, type ApplicationAuditEntry } from "./application-audit-history";
import { getAdminEditBlockReason } from "../edit-rules";
import { formatSubmissionDate } from "@/modules/applications/submission-date";
import "@/modules/applications/components/vki-form/vki-form.css";
import { VkiFormInline } from "./vki-form/vki-form-blocks";
import { VkiFormActions } from "./vki-form/vki-form-actions";
import { useVkiForm } from "./vki-form/vki-form-report";

type ApplicationDetailData = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  status: string;
  createdAt: string;
  submissionDate: string | null;
  payload: ApplicationWizardValues;
  assignments: { status: string }[];
  auditLogs: ApplicationAuditEntry[];
  locationSummaries: ApplicationLocationSummary[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

type Props = { id: string };

export function ApplicationDetail({ id }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["applications", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${id}`);
      if (!response.ok) throw new Error("Permohonan tidak ditemukan");
      const json = (await response.json()) as { data: ApplicationDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-2xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-2xl py-10 text-sm text-destructive">
        Data permohonan tidak ditemukan atau database belum terhubung.
      </p>
    );
  }

  const { payload } = data;
  const isVki = data.verificationType === "VKI";

  return (
    <div className={`mx-auto flex w-full flex-col gap-6 py-10 ${isVki ? "max-w-4xl px-4" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {data.applicationNumber}
          </p>
          <h1 className="text-lg font-semibold">{payload.companyName}</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge>{data.status}</Badge>
          <ReturnForRevisionDialog
            endpoint={`/api/applications/${data.id}/return`}
            applicationNumber={data.applicationNumber}
            status={data.status}
            assignmentStatuses={data.assignments.map((a) => a.status)}
            verificationType={data.verificationType}
            importTypes={payload.importTypes ?? []}
            onReturned={() => queryClient.invalidateQueries({ queryKey: ["applications"] })}
          />
          {!getAdminEditBlockReason(data.status) && data.status !== "DRAFT" && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/applications/${data.id}/edit`} />}>
              Edit Permohonan
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href="/applications" />}>
            Kembali ke Daftar
          </Button>
        </div>
      </div>

      <Section title="Application Information">
        <Item label="Verification Type" value={payload.verificationType} />
        <Item label="Application Category" value={payload.applicationCategory} />
        {/* Jenis Impor is a VIU concept; a VKI may still carry a stale value from the wizard. */}
        <Item label="Jenis Impor" value={payload.verificationType === "VIU" ? payload.importTypes?.join(", ") : "—"} />
        <Item label="Tanggal Pengajuan" value={formatSubmissionDate(data, true)} />
        <Item label="Dicatat di sistem" value={new Date(data.createdAt).toLocaleString("id-ID")} />
      </Section>

      {isVki ? <VkiFormSection id={data.id} /> : <GenericSections payload={payload} />}

      <ApplicationLocationsPanel locations={data.locationSummaries} />

      <ApplicationAuditHistory entries={data.auditLogs} />
    </div>
  );
}

/** VKI: the application laid out as the official Formulir Permohonan (A. Data Pemohon … G. Pernyataan). */
function VkiFormSection({ id }: { id: string }) {
  const { data: form, isLoading, isError, error } = useVkiForm(id);
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Formulir Permohonan VKI</h2>
        <VkiFormActions href={`/formulir-permohonan/${id}`} refId={id} />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Memuat formulir...</p>}
      {isError && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {form && (
        <div className="overflow-x-auto rounded-lg border border-border bg-white p-6 text-[#111]" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12.5, lineHeight: 1.5 }}>
          <VkiFormInline form={form} />
        </div>
      )}
    </section>
  );
}

function GenericSections({ payload }: { payload: ApplicationWizardValues }) {
  return (
    <>
      <Section title="Company Information">
        <Item label="Company Name" value={payload.companyName} />
        <Item label="Company Type" value={payload.companyType} />
        <Item label="Investment Status" value={payload.investmentStatus} />
        <Item label="Company Email" value={payload.companyEmail} />
        <Item label="Contact Name" value={payload.contactFullName} />
        <Item label="Contact Designation" value={payload.contactDesignation} />
      </Section>

      <Section title="Legal Information">
        <Item label="NIB Number" value={payload.nibNumber} />
        <Item
          label="KBLI"
          value={payload.kbliEntries?.map((entry) => entry.code).join(", ")}
        />
        <Item label="Notarial Deed Number" value={payload.notarialDeedNumber} />
        <Item label="Issuing Authority" value={payload.notarialIssuingAuthority} />
      </Section>

      <Section title="Tax Information">
        <Item label="NPWP" value={payload.npwpNumber} />
      </Section>

      <Section title="Location Information">
        <Item label="Jumlah Lokasi" value={payload.locations?.length?.toString()} />
        <Item
          label="Jenis Lokasi"
          value={payload.locations?.map((location) => location.locationType).join(", ")}
        />
      </Section>

      {/* Generic product list — only meaningful for Bahan Baku Industri/Non-Industri (see
          Step6ProductInformation's own gate). A Barang-Konsumsi-only application uses
          KonsumsiApplicationReview's own "Informasi Produk" section instead. */}
      {(payload.verificationType === "VKI" || payload.importTypes?.includes("BAHAN_BAKU_INDUSTRI") || payload.importTypes?.includes("BAHAN_BAKU_NON_INDUSTRI")) && (
        <Section title="Product Information">
          <Item label="Jumlah Produk" value={payload.products?.length?.toString()} />
          <Item
            label="Jenis Material"
            value={payload.products?.map((product) => product.materialType).join(", ")}
          />
        </Section>
      )}

      {payload.verificationType === "VIU" && payload.importTypes?.includes("BARANG_KONSUMSI") && (
        <SectionErrorBoundary label="VIU Konsumsi">
          <KonsumsiApplicationReview payload={payload} brandLookupApiBase="/api/merk" />
        </SectionErrorBoundary>
      )}

    </>
  );
}
