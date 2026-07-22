"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApplicationWizardValues } from "../schema";

type ApplicationDetailData = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  status: string;
  createdAt: string;
  payload: ApplicationWizardValues;
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {data.applicationNumber}
          </p>
          <h1 className="text-lg font-semibold">{payload.companyName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{data.status}</Badge>
          <Button variant="outline" nativeButton={false} render={<Link href="/applications" />}>
            Kembali ke Daftar
          </Button>
        </div>
      </div>

      <Section title="Application Information">
        <Item label="Verification Type" value={payload.verificationType} />
        <Item label="Application Category" value={payload.applicationCategory} />
        <Item label="Jenis Impor" value={payload.importTypes?.join(", ")} />
        <Item
          label="Tanggal Submit"
          value={new Date(data.createdAt).toLocaleString("id-ID")}
        />
      </Section>

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

      <Section title="Location Information">
        <Item label="Jumlah Lokasi" value={payload.locations?.length?.toString()} />
        <Item
          label="Jenis Lokasi"
          value={payload.locations?.map((location) => location.locationType).join(", ")}
        />
      </Section>

      <Section title="Product Information">
        <Item label="Jumlah Produk" value={payload.products?.length?.toString()} />
        <Item
          label="Jenis Material"
          value={payload.products?.map((product) => product.materialType).join(", ")}
        />
      </Section>
    </div>
  );
}
