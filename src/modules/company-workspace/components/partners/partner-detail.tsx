"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PARTNER_TYPE_LABELS, PARTNER_STATUS_LABELS, type PartnerType, type PartnerStatus } from "@/modules/partner/schema";

type PartnerDetailData = {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  contractDocumentPath: string | null;
  company: {
    companyName: string;
    companyType: string;
    apiType: string | null;
    nibNumber: string;
    npwpNumber: string | null;
    skNumber: string | null;
  };
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

type Props = { id: string };

export function CompanyPartnerDetail({ id }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "partners", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/company-workspace/partners/${id}`);
      if (!response.ok) throw new Error("Partner tidak ditemukan");
      const json = (await response.json()) as { data: PartnerDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
        <p className="text-sm text-destructive">Partner tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Link href="/company-workspace/supporting/partners" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {PARTNER_TYPE_LABELS[data.type]}
            </p>
            <h1 className="text-lg font-semibold">{data.company.companyName}</h1>
          </div>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/company-workspace/supporting/partners" />}>
          Kembali ke Daftar
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Perusahaan</h2>
            <Badge variant={data.status === "ACTIVE" ? "default" : "secondary"}>
              {PARTNER_STATUS_LABELS[data.status]}
            </Badge>
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Tipe Perusahaan" value={data.company.companyType} />
            <DetailItem label="Jenis API" value={data.company.apiType} />
            <DetailItem label="NIB" value={data.company.nibNumber} />
            <DetailItem label="NPWP" value={data.company.npwpNumber} />
            <DetailItem label="SK Kemenkumham" value={data.company.skNumber} />
          </div>
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-sm font-semibold">Kontrak Kerja Sama</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Nomor Kontrak" value={data.contractNumber} />
            <DetailItem label="Tanggal Mulai" value={new Date(data.contractStartDate).toLocaleDateString("id-ID")} />
            <DetailItem label="Tanggal Berakhir" value={new Date(data.contractEndDate).toLocaleDateString("id-ID")} />
            <DetailItem label="Bukti Kontrak" value={data.contractDocumentPath ? "Terunggah" : "Belum diunggah"} />
          </div>
        </section>
      </div>
    </div>
  );
}
