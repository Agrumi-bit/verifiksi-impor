"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  MERK_EVIDENCE_TYPE_LABELS,
  MERK_OWNER_LOCATION_LABELS,
  MERK_APIU_RELATIONSHIP_LABELS,
  MERK_REPRESENTATION_TYPE_LABELS,
  type MerkEvidenceType,
  type MerkOwnerLocation,
  type MerkApiuRelationship,
  type MerkRepresentationType,
} from "@/modules/merk/schema";
import { BRAND_DOCUMENT_CATEGORY_LABELS } from "@/modules/merk/document-requirements";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";
import { EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS, formatDate, getExpiryStatus } from "./expiry-status";

type DetailData = {
  id: string;
  status: string;
  brandName: string;
  countryOfOrigin: string;
  certificateType: MerkEvidenceType | null;
  registrationNumber: string | null;
  registrationDate: string | null;
  registrationExpiryDate: string | null;
  trademarkClass: string | null;
  ownership: {
    ownerLocation: string;
    relationshipWithApiu: string | null;
    representationType: string | null;
    appointmentSource: string | null;
    agreementType: string | null;
    ownerName: string | null;
    ownerCompany: { name: string } | null;
    officialRepresentative: { name: string } | null;
  } | null;
  documents: { id: string; documentType: string; category: string; fileName: string; filePath: string; expiryDate: string | null }[];
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

function lower<T extends string>(value: string | null | undefined): T | undefined {
  return value ? (value.toLowerCase() as T) : undefined;
}

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

type Props = {
  id: string;
  apiBase: string;
  detailHref: string;
  onClose: () => void;
  onEdit: () => void;
  /** Opens straight to a specific tab — used by row actions like "Lihat
   * Dokumen" / "Lihat Perwakilan Resmi" on Pemilik & Perwakilan. */
  defaultTab?: "overview" | "ownership" | "trademark" | "documents" | "qt" | "activity";
};

/** Compact read-only preview drawer for "Semua Merek" — a lighter-weight
 * sibling of the full `MerkDetail` page: same 6 tabs, same real data, but a
 * slide-over instead of a navigation. "Lihat Detail (halaman penuh)" still
 * links to the real detail page for anything this preview keeps brief. */
export function BrandDetailDrawer({ id, apiBase, detailHref, onClose, onEdit, defaultTab = "overview" }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-surface", apiBase, id],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/${id}`);
      if (!response.ok) throw new Error("Merek tidak ditemukan");
      const json = (await response.json()) as { data: DetailData };
      return json.data;
    },
  });

  const ownership = data?.ownership;
  const isDomestic = ownership?.ownerLocation === "DOMESTIC";
  const ownerTitle = ownership
    ? isDomestic
      ? (ownership.ownerCompany?.name ?? ownership.ownerName)
      : ownership.ownerName
    : null;

  const completeness = data
    ? computeBrandCompleteness({
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
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className="relative z-10 flex h-full w-full max-w-[460px] flex-col bg-background shadow-2xl">
        <div className="flex flex-none items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Detail Merek</h2>
            <p className="text-xs text-muted-foreground">Pratinjau data merek</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {isError && <p className="text-sm text-destructive">Data merek tidak ditemukan.</p>}
          {data && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
                  {data.brandName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{data.brandName}</p>
                  <Badge variant={data.status === "ACTIVE" ? "default" : data.status === "DRAFT" ? "outline" : "secondary"}>
                    {data.status}
                  </Badge>
                </div>
              </div>

              <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/30 p-3.5 text-sm">
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Pemilik Merek</dt>
                  <dd className="font-semibold">{ownerTitle || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Negara</dt>
                  <dd className="font-semibold">{data.countryOfOrigin}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Nomor Merek</dt>
                  <dd className="font-mono font-semibold">{data.registrationNumber || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Kelas Merek</dt>
                  <dd className="font-semibold">{data.trademarkClass || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Kelengkapan</dt>
                  <dd className="font-semibold">
                    {completeness ? `${completeness.completeCount} / ${completeness.requiredCount} dokumen (${completeness.percent}%)` : "—"}
                  </dd>
                </div>
              </dl>

              <Tabs defaultValue={defaultTab}>
                <TabsList>
                  <TabsTab value="overview">Overview</TabsTab>
                  <TabsTab value="ownership">Ownership</TabsTab>
                  <TabsTab value="trademark">Trademark</TabsTab>
                  <TabsTab value="documents">Documents</TabsTab>
                  <TabsTab value="qt">Quality Test</TabsTab>
                  <TabsTab value="activity">Activity</TabsTab>
                </TabsList>

                <TabsPanel value="overview">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Jenis Bukti Merek</span>
                      <span className="font-semibold">{data.certificateType ? MERK_EVIDENCE_TYPE_LABELS[data.certificateType] : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Data Completeness</span>
                      <span className="font-semibold">{completeness?.percent ?? 0}%</span>
                    </div>
                  </div>
                </TabsPanel>

                <TabsPanel value="ownership">
                  {ownership ? (
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <span className="text-muted-foreground">Lokasi Pemilik: </span>
                        <span className="font-semibold">{MERK_OWNER_LOCATION_LABELS[lower<MerkOwnerLocation>(ownership.ownerLocation) ?? "domestic"]}</span>
                      </div>
                      {ownership.relationshipWithApiu && (
                        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                          <span className="text-muted-foreground">Hubungan API-U: </span>
                          <span className="font-semibold">{MERK_APIU_RELATIONSHIP_LABELS[lower<MerkApiuRelationship>(ownership.relationshipWithApiu)!]}</span>
                        </div>
                      )}
                      {ownership.representationType && (
                        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                          <span className="text-muted-foreground">Representasi: </span>
                          <span className="font-semibold">{MERK_REPRESENTATION_TYPE_LABELS[lower<MerkRepresentationType>(ownership.representationType)!]}</span>
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">{ownerTitle || "Pemilik Merek"}</span>
                        {ownership.officialRepresentative && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">{ownership.officialRepresentative.name}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">{APIU_PLACEHOLDER_NAME}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada data kepemilikan &amp; perwakilan.</p>
                  )}
                </TabsPanel>

                <TabsPanel value="trademark">
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Nomor</span>
                      <span className="font-mono font-semibold">{data.registrationNumber || "—"}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Tanggal</span>
                      <span className="font-semibold">{formatDate(data.registrationDate)}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Kadaluarsa</span>
                      <span className="font-semibold">{formatDate(data.registrationExpiryDate)}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Kelas</span>
                      <span className="font-semibold">{data.trademarkClass || "—"}</span>
                    </div>
                  </div>
                </TabsPanel>

                <TabsPanel value="documents">
                  {data.documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada dokumen diunggah.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {data.documents.map((doc) => {
                        const status = getExpiryStatus(doc.expiryDate);
                        return (
                          <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{doc.fileName}</p>
                              <p className="text-[10.5px] text-muted-foreground">
                                {BRAND_DOCUMENT_CATEGORY_LABELS[doc.category as keyof typeof BRAND_DOCUMENT_CATEGORY_LABELS] ?? doc.category}
                              </p>
                            </div>
                            {doc.expiryDate && (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>
                                {EXPIRY_STATUS_LABELS[status]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsPanel>

                <TabsPanel value="qt">
                  {data.qualityTests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada hasil uji mutu.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {data.qualityTests.map((qt) => (
                        <div key={qt.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                          <p className="font-semibold">
                            {qt.commodityGroup.name}
                            {qt.commoditySubGroup && ` / ${qt.commoditySubGroup.name}`}
                          </p>
                          <p className="text-muted-foreground">{qt.certificateNumber} · {qt.laboratoryName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsPanel>

                <TabsPanel value="activity">
                  <p className="text-xs text-muted-foreground">
                    Belum ada sistem pencatatan aktivitas (activity log) untuk merek ini.
                  </p>
                </TabsPanel>
              </Tabs>
            </>
          )}
        </div>

        <div className="flex flex-none items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`${detailHref}/${id}`} />}>
            Buka Halaman Penuh
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Tutup</Button>
            <Button size="sm" onClick={onEdit}>Edit Merek</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
