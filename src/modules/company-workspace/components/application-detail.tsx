"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, Copy, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  statusBadgeVariant,
  type ApplicationStatusValue,
} from "../status";

type ApplicationDetailData = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  status: ApplicationStatusValue;
  createdAt: string;
  updatedAt: string;
  payload: ApplicationWizardValues;
};

const PIPELINE_ORDER: ApplicationStatusValue[] = APPLICATION_STATUSES.filter(
  (status) => !TERMINAL_STATUSES.includes(status) || status === "COMPLETED",
);

const NOT_YET_AVAILABLE_SECTIONS = [
  { title: "Findings", description: "Temuan hasil survei/verifikasi lapangan." },
  { title: "Corrective Actions", description: "Tindakan perbaikan atas temuan yang tercatat." },
  { title: "Survey Information", description: "Jadwal dan detail kunjungan survei." },
  { title: "Assigned Officers", description: "Petugas surveyor/verifikator yang ditugaskan." },
  { title: "Communication", description: "Riwayat komunikasi dengan tim verifikasi." },
  { title: "Task Center", description: "Daftar tugas yang perlu diselesaikan perusahaan." },
  { title: "Submission History", description: "Riwayat pengiriman ulang dan revisi dokumen." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
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

function ReadinessRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 text-emerald-500" />
      ) : (
        <Circle className="size-4 text-muted-foreground" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

type Props = { id: string };

export function CompanyApplicationDetail({ id }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "applications", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}`);
      if (!response.ok) throw new Error("Permohonan tidak ditemukan");
      const json = (await response.json()) as { data: ApplicationDetailData };
      return json.data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menarik permohonan");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Permohonan berhasil ditarik.");
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menarik permohonan");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/company-workspace/applications/${id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menduplikasi permohonan");
      }
      return response.json() as Promise<{ id: string; applicationNumber: string }>;
    },
    onSuccess: (result) => {
      toast.success(`Draft baru dibuat: ${result.applicationNumber}`);
      queryClient.invalidateQueries({ queryKey: ["company-workspace", "applications"] });
      router.push(`/company-workspace/applications/${result.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menduplikasi permohonan");
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-3xl py-10 text-sm text-destructive">
        Permohonan tidak ditemukan, atau bukan milik perusahaan Anda.
      </p>
    );
  }

  const { payload } = data;
  const isTerminal = TERMINAL_STATUSES.includes(data.status);
  const currentIndex = PIPELINE_ORDER.indexOf(data.status);

  const readiness = [
    { label: "Profil Perusahaan", done: Boolean(payload.companyName && payload.companyEmail) },
    { label: "Informasi Legal (NIB & Akta)", done: Boolean(payload.nibNumber && payload.notarialDeedNumber) },
    { label: "Lokasi & Fasilitas", done: (payload.locations?.length ?? 0) > 0 },
    { label: "Informasi Produk", done: (payload.products?.length ?? 0) > 0 },
    { label: "Pernyataan Disetujui", done: Boolean(payload.declarationAccepted) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
      {/* Current Status — always visible at top */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{data.applicationNumber}</p>
            <h1 className="text-lg font-semibold">{payload.companyName}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                {data.verificationType}
              </span>
              <Badge variant={statusBadgeVariant(data.status)}>{STATUS_LABELS[data.status]}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}
            >
              <Copy className="size-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isTerminal || withdrawMutation.isPending}
              onClick={() => {
                if (confirm(`Tarik permohonan ${data.applicationNumber}?`)) {
                  withdrawMutation.mutate();
                }
              }}
            >
              <Undo2 className="size-4" />
              Withdraw
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/company-workspace/applications" />}>
              Kembali ke Daftar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview + Application Readiness */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Overview">
          <Item label="Application Category" value={payload.applicationCategory} />
          <Item label="Jenis Impor" value={payload.importTypes?.join(", ")} />
          <Item label="Tanggal Submit" value={new Date(data.createdAt).toLocaleString("id-ID")} />
          <Item label="Terakhir Diperbarui" value={new Date(data.updatedAt).toLocaleString("id-ID")} />
        </Section>

        <Card>
          <CardHeader>
            <CardTitle>Application Readiness</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {readiness.map((row) => (
              <ReadinessRow key={row.label} label={row.label} done={row.done} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Process Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Process Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {data.status === "REJECTED" || data.status === "WITHDRAWN" ? (
            <p className="text-sm text-muted-foreground">
              Permohonan ini telah dihentikan dengan status{" "}
              <strong>{STATUS_LABELS[data.status]}</strong>.
            </p>
          ) : (
            <ol className="flex flex-wrap gap-x-6 gap-y-3">
              {PIPELINE_ORDER.map((status, index) => {
                const isDone = index < currentIndex;
                const isCurrent = index === currentIndex;
                return (
                  <li key={status} className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        isCurrent
                          ? "flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                          : isDone
                            ? "flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                            : "flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground"
                      }
                    >
                      {isDone ? <CheckCircle2 className="size-3.5" /> : index + 1}
                    </span>
                    <span className={isCurrent ? "font-semibold" : "text-muted-foreground"}>
                      {STATUS_LABELS[status]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Section title="Company Information">
        <Item label="Company Name" value={payload.companyName} />
        <Item label="Company Type" value={payload.companyType} />
        <Item label="Investment Status" value={payload.investmentStatus} />
        <Item label="Company Email" value={payload.companyEmail} />
        <Item label="Contact Name" value={payload.contactFullName} />
        <Item label="Contact Designation" value={payload.contactDesignation} />
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>Facilities</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(payload.locations?.length ?? 0) > 0 ? (
            payload.locations.map((location, index) => (
              <div key={index} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{location.locationType}</p>
                <p className="text-xs text-muted-foreground">{location.address}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada fasilitas/lokasi terdaftar.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supporting Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {payload.mitraIndustriId ? (
            <p className="text-sm">
              Mitra Industri terhubung — NIB: {payload.mitraIndustriNib || "—"}, LHVKI:{" "}
              {payload.mitraIndustriLhvki || "—"}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada mitra industri yang terhubung.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {(payload.products?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-2">
              {payload.products.map((product) => (
                <div key={product.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{product.materialType}</p>
                  <p className="text-xs text-muted-foreground">
                    HS Code: {product.hsCode} · {product.estimatedVolume} {product.volumeUnit} ·{" "}
                    {product.intendedUse}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada rencana impor tercatat.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ReadinessRow label="NIB Document" done={Boolean(payload.nibDocumentPath)} />
          <ReadinessRow label="KBLI Document" done={Boolean(payload.kbliDocumentPath)} />
          <ReadinessRow label="Notarial Deed Document" done={Boolean(payload.notarialDocumentPath)} />
          {payload.nonIndustriDocuments?.map((document) => (
            <ReadinessRow key={document.id} label={document.label} done={Boolean(document.documentPath)} />
          ))}
          {payload.konsumsiDocuments?.map((document) => (
            <ReadinessRow key={document.id} label={document.label} done={Boolean(document.documentPath)} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {NOT_YET_AVAILABLE_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{section.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Modul ini akan tersedia di iterasi berikutnya.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
