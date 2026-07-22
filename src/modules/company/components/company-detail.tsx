"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LocationValues } from "@/modules/shared/schema";

type CompanyDetailData = {
  id: string;
  status: string;
  companyName: string;
  companyType: string;
  investmentStatus: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  contactFullName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  nibNumber: string;
  nibIssueDate: string;
  notarialDeedNumber: string;
  notarialIssuingAuthority: string;
  kbliEntries: { code: string; description: string }[];
  locations: LocationValues[];
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

type Props = { id: string };

export function CompanyDetail({ id }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${id}`);
      if (!response.ok) throw new Error("Perusahaan tidak ditemukan");
      const json = (await response.json()) as { data: CompanyDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-2xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-2xl py-10 text-sm text-destructive">
        Data perusahaan tidak ditemukan atau database belum terhubung.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Company Registry
          </p>
          <h1 className="text-lg font-semibold">{data.companyName}</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/company" />}>
          Kembali ke Daftar
        </Button>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Company Profile</h2>
          <Badge variant={data.status === "ACTIVE" ? "default" : "secondary"}>
            {data.status}
          </Badge>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Company Type" value={data.companyType} />
          <DetailItem label="Investment Status" value={data.investmentStatus} />
          <DetailItem label="Company Email" value={data.companyEmail} />
          <DetailItem label="Company Phone" value={data.companyPhone} />
          <DetailItem label="Company Website" value={data.companyWebsite} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Contact</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Nama Kontak" value={data.contactFullName} />
          <DetailItem label="Jabatan" value={data.contactDesignation} />
          <DetailItem label="Email" value={data.contactEmail} />
          <DetailItem label="Telepon" value={data.contactPhone} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Legal Information</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Nomor NIB" value={data.nibNumber} />
          <DetailItem
            label="Tanggal Terbit NIB"
            value={new Date(data.nibIssueDate).toLocaleDateString("id-ID")}
          />
          <DetailItem
            label="KBLI"
            value={data.kbliEntries?.map((entry) => entry.code).join(", ")}
          />
          <DetailItem label="Nomor Akta Notaris" value={data.notarialDeedNumber} />
          <DetailItem label="Notaris" value={data.notarialIssuingAuthority} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Lokasi ({data.locations?.length ?? 0})</h2>
        <div className="flex flex-col gap-3">
          {data.locations?.map((location) => (
            <div key={location.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{location.locationType} — {location.city}</p>
              <p className="text-xs text-muted-foreground">{location.address}, {location.province}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
