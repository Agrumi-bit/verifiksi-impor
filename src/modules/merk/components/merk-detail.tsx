"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { DetailSection, DetailItem } from "@/components/layout/detail-section";
import { ComingSoon } from "@/components/layout/coming-soon";
import { MerkWizard } from "./merk-wizard";
import {
  MERK_EVIDENCE_TYPE_LABELS,
  MERK_OWNER_LOCATION_LABELS,
  MERK_OWNER_TYPE_LABELS,
  MERK_APIU_RELATIONSHIP_LABELS,
  MERK_REPRESENTATION_TYPE_LABELS,
  MERK_AGREEMENT_TYPE_LABELS,
  type MerkEvidenceType,
  type MerkOwnerLocation,
  type MerkOwnerType,
  type MerkApiuRelationship,
  type MerkRepresentationType,
  type MerkAgreementType,
  type MerkStatusValue,
} from "@/modules/merk/schema";
import type { MerkSurface } from "@/modules/merk/surface";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";
import { BRAND_DOCUMENT_CATEGORY_LABELS } from "@/modules/merk/document-requirements";
import { EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS, formatDate, getExpiryStatus } from "./management/expiry-status";

type MerkDetailData = {
  id: string;
  status: string;
  brandName: string;
  logoPath: string | null;
  countryOfOrigin: string;
  certificateType: MerkEvidenceType | null;
  registrationNumber: string | null;
  registrationIssuer: string | null;
  registrationDate: string | null;
  registrationExpiryDate: string | null;
  trademarkClass: string | null;
  trademarkClassDescription: string | null;
  merekStatusLabel: string | null;
  ownership: {
    ownerLocation: string;
    ownerType: string | null;
    ownerName: string | null;
    ownerAddress: string | null;
    ownerCountryCode: string | null;
    relationshipWithApiu: string | null;
    representationType: string | null;
    agreementType: string | null;
    agreementNumber: string | null;
    agreementStartDate: string | null;
    agreementEndDate: string | null;
    appointmentSource: string | null;
    appointmentLetterNumber: string | null;
    appointmentStartDate: string | null;
    appointmentEndDate: string | null;
    ownerCompany: { name: string } | null;
    officialRepresentative: { name: string } | null;
  } | null;
  documents: {
    id: string;
    documentType: string;
    category: string;
    filePath: string;
    fileName: string;
    documentNumber: string | null;
    issueDate: string | null;
    expiryDate: string | null;
  }[];
  qualityTests: {
    id: string;
    certificateNumber: string;
    laboratoryName: string;
    issueDate: string;
    expiryDate: string | null;
    commodityGroup: { name: string };
    commoditySubGroup: { name: string } | null;
  }[];
};

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

function lower<T extends string>(value: string | null | undefined): T | undefined {
  return value ? (value.toLowerCase() as T) : undefined;
}

type Props = { id: string; surface: MerkSurface };

export function MerkDetail({ id, surface }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const detailKey = ["merk-surface", surface.apiBase, id];
  const { data, isLoading, isError } = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      const response = await fetch(`${surface.apiBase}/${id}`);
      if (!response.ok) throw new Error("Merek tidak ditemukan");
      const json = (await response.json()) as { data: MerkDetailData };
      return json.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: MerkStatusValue) => {
      const response = await fetch(`${surface.apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal memperbarui status merek");
      }
      return response.json();
    },
    onSuccess: (_result, status) => {
      queryClient.invalidateQueries({ queryKey: detailKey });
      queryClient.invalidateQueries({ queryKey: ["merk-surface", surface.apiBase] });
      toast.success(status === "ACTIVE" ? "Merek diaktifkan." : "Merek dinonaktifkan.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status merek");
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Data merek tidak ditemukan atau database belum terhubung.
      </p>
    );
  }

  const ownership = data.ownership;
  const isDomestic = ownership?.ownerLocation === "DOMESTIC";
  const ownerTitle = ownership
    ? isDomestic
      ? (ownership.ownerCompany?.name ?? ownership.ownerName)
      : ownership.ownerName
    : null;
  const representativeTitle = ownership
    ? ownership.relationshipWithApiu === "APIU_IS_OWNER" || ownership.representationType === "APIU_OFFICIAL_REPRESENTATIVE"
      ? APIU_PLACEHOLDER_NAME
      : (ownership.officialRepresentative?.name ?? null)
    : null;
  const importerTitle = ownership ? APIU_PLACEHOLDER_NAME : null;

  const completeness = computeBrandCompleteness({
    certificateType: data.certificateType,
    ownership: ownership
      ? {
          ownerLocation: ownership.ownerLocation,
          relationshipWithApiu: ownership.relationshipWithApiu,
          representationType: ownership.representationType,
          appointmentSource: ownership.appointmentSource,
          agreementType: ownership.agreementType,
        }
      : null,
    documents: data.documents,
  });
  const dataCompletenessChecks = [
    Boolean(data.countryOfOrigin && data.countryOfOrigin !== "Belum ditentukan"),
    Boolean(data.certificateType),
    Boolean(data.registrationNumber),
    Boolean(data.trademarkClass),
    Boolean(ownership),
  ];
  const dataCompleteness = Math.round(
    (dataCompletenessChecks.filter(Boolean).length / dataCompletenessChecks.length) * 100,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Merk</p>
          <h1 className="text-lg font-semibold">{data.brandName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={surface.listHref} />}>
            Kembali ke Daftar
          </Button>
        </div>
      </div>

      {isEditOpen && (
        <MerkWizard surface={surface} draftId={id} onClose={() => setIsEditOpen(false)} />
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTab value="overview">Overview</TabsTab>
          <TabsTab value="ownership">Ownership &amp; Representation</TabsTab>
          <TabsTab value="trademark">Trademark</TabsTab>
          <TabsTab value="documents">Documents</TabsTab>
          <TabsTab value="quality-test">Quality Test</TabsTab>
          <TabsTab value="activity">Activity</TabsTab>
          {surface.showAudit && <TabsTab value="audit">Audit</TabsTab>}
        </TabsList>

        <TabsPanel value="overview">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-lg font-bold">{data.brandName}</p>
                <p className="text-xs text-muted-foreground">
                  {data.trademarkClass ? `Kelas ${data.trademarkClass}` : "Kelas belum diisi"} · {data.countryOfOrigin}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={data.status === "ACTIVE" ? "default" : data.status === "DRAFT" ? "outline" : "secondary"}>
                  {data.status}
                </Badge>
                {data.status !== "DRAFT" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(data.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                  >
                    {statusMutation.isPending ? "Menyimpan..." : data.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                )}
              </div>
            </div>

            <DetailSection title="Ringkasan">
              <DetailItem label="Owner" value={ownerTitle ?? undefined} />
              <DetailItem label="Owner Country" value={isDomestic ? "Indonesia" : (ownership?.ownerCountryCode ?? undefined)} />
              <DetailItem label="Trademark Number" value={data.registrationNumber ?? undefined} />
              <DetailItem label="Trademark Class" value={data.trademarkClass ?? undefined} />
              <DetailItem
                label="Evidence Type"
                value={data.certificateType ? MERK_EVIDENCE_TYPE_LABELS[data.certificateType] : undefined}
              />
              <DetailItem label="Data Completeness" value={`${dataCompleteness}%`} />
              <DetailItem
                label="Document Completeness"
                value={`${completeness.completeCount} / ${completeness.requiredCount} (${completeness.percent}%)`}
              />
            </DetailSection>

            {ownership && (
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm font-semibold">Relationship Summary</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-medium">
                    {ownerTitle ?? "Pemilik Merek"}
                  </span>
                  {representativeTitle && representativeTitle !== ownerTitle && (
                    <>
                      <span className="text-muted-foreground">↓</span>
                      <span className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-medium">
                        {representativeTitle}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">↓</span>
                  <span className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-medium">
                    {importerTitle}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsPanel>

        <TabsPanel value="ownership">
          {ownership ? (
            <div className="flex flex-col gap-4">
              <DetailSection title="Owner Information">
                <DetailItem label="Lokasi Pemilik Merek" value={MERK_OWNER_LOCATION_LABELS[lower<MerkOwnerLocation>(ownership.ownerLocation) ?? "domestic"]} />
                {isDomestic ? (
                  <>
                    <DetailItem
                      label="Jenis Pemilik"
                      value={ownership.ownerType ? MERK_OWNER_TYPE_LABELS[lower<MerkOwnerType>(ownership.ownerType)!] : undefined}
                    />
                    <DetailItem label="Pemilik Merek" value={ownerTitle ?? undefined} />
                    <DetailItem
                      label="Hubungan dengan API-U"
                      value={
                        ownership.relationshipWithApiu
                          ? MERK_APIU_RELATIONSHIP_LABELS[lower<MerkApiuRelationship>(ownership.relationshipWithApiu)!]
                          : undefined
                      }
                    />
                  </>
                ) : (
                  <>
                    <DetailItem label="Pemilik Merek" value={ownership.ownerName ?? undefined} />
                    <DetailItem label="Negara Pemilik Merek" value={ownership.ownerCountryCode ?? undefined} />
                    <DetailItem label="Alamat" value={ownership.ownerAddress ?? undefined} />
                    <DetailItem
                      label="Representation Type"
                      value={
                        ownership.representationType
                          ? MERK_REPRESENTATION_TYPE_LABELS[lower<MerkRepresentationType>(ownership.representationType)!]
                          : undefined
                      }
                    />
                    {ownership.officialRepresentative && (
                      <DetailItem label="Official Representative" value={ownership.officialRepresentative.name} />
                    )}
                  </>
                )}
              </DetailSection>

              {(ownership.agreementType || ownership.agreementNumber) && (
                <DetailSection title="License / Sublicense">
                  <DetailItem
                    label="Jenis Perjanjian"
                    value={ownership.agreementType ? MERK_AGREEMENT_TYPE_LABELS[lower<MerkAgreementType>(ownership.agreementType)!] : undefined}
                  />
                  <DetailItem label="Nomor Perjanjian" value={ownership.agreementNumber ?? undefined} />
                  <DetailItem label="Tanggal Berlaku" value={formatDate(ownership.agreementStartDate)} />
                  <DetailItem label="Tanggal Berakhir" value={formatDate(ownership.agreementEndDate)} />
                </DetailSection>
              )}

              {(ownership.appointmentSource || ownership.appointmentLetterNumber) && (
                <DetailSection title="Importer Appointment">
                  <DetailItem label="Nomor Surat Penunjukan" value={ownership.appointmentLetterNumber ?? undefined} />
                  <DetailItem label="Tanggal Berlaku" value={formatDate(ownership.appointmentStartDate)} />
                  <DetailItem label="Tanggal Berakhir" value={formatDate(ownership.appointmentEndDate)} />
                </DetailSection>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data kepemilikan &amp; perwakilan.</p>
          )}
        </TabsPanel>

        <TabsPanel value="trademark">
          <DetailSection title="Trademark">
            <DetailItem
              label="Evidence Type"
              value={data.certificateType ? MERK_EVIDENCE_TYPE_LABELS[data.certificateType] : undefined}
            />
            <DetailItem label="Registration / Certificate Number" value={data.registrationNumber ?? undefined} />
            <DetailItem label="Issuing Authority" value={data.registrationIssuer ?? undefined} />
            <DetailItem label="Registration Date" value={formatDate(data.registrationDate)} />
            <DetailItem label="Certificate Expiry Date" value={formatDate(data.registrationExpiryDate)} />
            <DetailItem label="Trademark Class" value={data.trademarkClass ?? undefined} />
            <DetailItem label="Trademark Status" value={data.merekStatusLabel ?? undefined} />
            <DetailItem label="Country" value={data.countryOfOrigin} />
            <div className="sm:col-span-2">
              <DetailItem label="Uraian Kelas Merek" value={data.trademarkClassDescription ?? undefined} />
            </div>
          </DetailSection>
        </TabsPanel>

        <TabsPanel value="documents">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Kelengkapan Dokumen</p>
                <span className="text-sm font-bold text-primary">{completeness.percent}%</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completeness.completeCount} dari {completeness.requiredCount} dokumen wajib telah diunggah
              </p>
              {completeness.missingLabels.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                  {completeness.missingLabels.map((label) => (
                    <li key={label}>{label} — Missing</li>
                  ))}
                </ul>
              )}
            </div>

            {Object.entries(BRAND_DOCUMENT_CATEGORY_LABELS).map(([category, label]) => {
              const docs = data.documents.filter((d) => d.category === category);
              if (docs.length === 0) return null;
              return (
                <div key={category} className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-sm font-semibold">{label}</p>
                  <ul className="flex flex-col gap-2">
                    {docs.map((doc) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      return (
                        <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate">{doc.fileName}</span>
                          <span className="flex shrink-0 items-center gap-2 text-xs">
                            {doc.expiryDate && (
                              <span className={`rounded-full px-2 py-0.5 font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>
                                {EXPIRY_STATUS_LABELS[status]}
                              </span>
                            )}
                            <span className="text-muted-foreground">{formatDate(doc.expiryDate)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {data.documents.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada dokumen diunggah.</p>
            )}
          </div>
        </TabsPanel>

        <TabsPanel value="quality-test">
          {data.qualityTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada hasil uji mutu.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.qualityTests.map((qt) => {
                const status = getExpiryStatus(qt.expiryDate);
                return (
                  <li key={qt.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {qt.commodityGroup.name}
                        {qt.commoditySubGroup && ` / ${qt.commoditySubGroup.name}`}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>
                        {EXPIRY_STATUS_LABELS[status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {qt.certificateNumber} · {qt.laboratoryName} · Terbit {formatDate(qt.issueDate)}
                      {qt.expiryDate && ` · Berlaku hingga ${formatDate(qt.expiryDate)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsPanel>

        <TabsPanel value="activity">
          <ComingSoon
            title="Riwayat Aktivitas Belum Tersedia"
            description="Belum ada sistem pencatatan aktivitas (activity log) untuk perubahan data merek pada versi ini."
          />
        </TabsPanel>

        {surface.showAudit && (
          <TabsPanel value="audit">
            <ComingSoon
              title="Audit Trail Belum Tersedia"
              description="Belum ada sistem audit trail (pencatatan perubahan field) pada platform ini. Bagian ini akan diisi begitu infrastruktur audit tersedia, bukan dengan data buatan."
            />
          </TabsPanel>
        )}
      </Tabs>
    </div>
  );
}
