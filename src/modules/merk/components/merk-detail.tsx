"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MerkStatusValue } from "@/modules/merk/schema";
import type { MerkSurface } from "@/modules/merk/surface";

type MerkDetailData = {
  id: string;
  status: string;
  brandName: string;
  productCategory: string;
  countryOfOrigin: string;
  registrationNumber: string;
  ownershipType: string;
  brandOwnerName: string;
  licenseAgreementNumber: string | null;
  licenseStartDate: string | null;
  licenseEndDate: string | null;
};

const OWNERSHIP_LABELS: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri",
  LISENSI: "Lisensi",
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

type Props = { id: string; surface: MerkSurface };

export function MerkDetail({ id, surface }: Props) {
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
      toast.success(
        status === "ACTIVE" ? "Merek diaktifkan." : "Merek dinonaktifkan.",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status merek");
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-2xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-2xl py-10 text-sm text-destructive">
        Data merek tidak ditemukan atau database belum terhubung.
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Merk
          </p>
          <h1 className="text-lg font-semibold">{data.brandName}</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={surface.listHref} />}>
          Kembali ke Daftar
        </Button>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Informasi Merek</h2>
          <div className="flex items-center gap-2">
            <Badge variant={data.status === "ACTIVE" ? "default" : "secondary"}>
              {data.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate(data.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")
              }
            >
              {statusMutation.isPending
                ? "Menyimpan..."
                : data.status === "ACTIVE"
                  ? "Nonaktifkan"
                  : "Aktifkan"}
            </Button>
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem label="Kategori Produk" value={data.productCategory} />
          <DetailItem label="Negara Asal" value={data.countryOfOrigin} />
          <DetailItem label="Nomor Registrasi" value={data.registrationNumber} />
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Kepemilikan</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailItem
            label="Status Kepemilikan"
            value={OWNERSHIP_LABELS[data.ownershipType] ?? data.ownershipType}
          />
          <DetailItem label="Pemilik Merek" value={data.brandOwnerName} />
          {data.ownershipType === "LISENSI" && (
            <>
              <DetailItem
                label="Nomor Perjanjian Lisensi"
                value={data.licenseAgreementNumber}
              />
              <DetailItem
                label="Masa Berlaku Lisensi"
                value={
                  data.licenseStartDate && data.licenseEndDate
                    ? `${new Date(data.licenseStartDate).toLocaleDateString("id-ID")} – ${new Date(data.licenseEndDate).toLocaleDateString("id-ID")}`
                    : undefined
                }
              />
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
