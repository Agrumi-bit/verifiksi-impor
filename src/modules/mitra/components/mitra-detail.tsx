"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MITRA_TYPE_LABELS, type MitraType } from "../schema";

type MitraDetailData = {
  id: string;
  type: MitraType;
  status: string;
  name: string;
  nibNumber: string;
  address: string;
  city: string;
  province: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  lhvkiNumber: string | null;
  lhvkiIssueDate: string | null;
  contractNumber: string | null;
  contractDate: string | null;
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

type Props = {
  id: string;
  type: MitraType;
};

export function MitraDetail({ id, type }: Props) {
  const basePath = type === "INDUSTRI" ? "/mitra/industri" : "/mitra/non-industri";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mitra", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/mitra/${id}`);
      if (!response.ok) throw new Error("Mitra tidak ditemukan");
      const json = (await response.json()) as { data: MitraDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-2xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-2xl py-10 text-sm text-destructive">
        Data mitra tidak ditemukan atau database belum terhubung.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {MITRA_TYPE_LABELS[type]}
          </p>
          <h1 className="text-lg font-semibold">{data.name}</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={basePath} />}>
          Kembali ke Daftar
        </Button>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Profil</h2>
          <Badge variant={data.status === "ACTIVE" ? "default" : "secondary"}>
            {data.status}
          </Badge>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Nomor NIB" value={data.nibNumber} />
          <DetailItem label="Kota" value={data.city} />
          <DetailItem label="Alamat" value={data.address} />
          <DetailItem label="Provinsi" value={data.province} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Kontak</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Nama Kontak" value={data.contactName} />
          <DetailItem label="Telepon" value={data.contactPhone} />
          <DetailItem label="Email" value={data.contactEmail} />
        </dl>
      </section>

      {type === "INDUSTRI" ? (
        <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">LHVKI</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailItem label="Nomor LHVKI" value={data.lhvkiNumber} />
            <DetailItem
              label="Tanggal Terbit"
              value={data.lhvkiIssueDate ? new Date(data.lhvkiIssueDate).toLocaleDateString("id-ID") : null}
            />
          </dl>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Kontrak Kerja Sama</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailItem label="Nomor Kontrak" value={data.contractNumber} />
            <DetailItem
              label="Tanggal Kontrak"
              value={data.contractDate ? new Date(data.contractDate).toLocaleDateString("id-ID") : null}
            />
          </dl>
        </section>
      )}
    </div>
  );
}
