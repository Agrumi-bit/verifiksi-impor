"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MerkStatusValue } from "@/modules/merk/schema";
import type { MerkSurface } from "@/modules/merk/surface";

type MerkListItem = {
  id: string;
  brandName: string;
  productCategory: string;
  countryOfOrigin: string;
  ownershipType: string;
  status: string;
};

const OWNERSHIP_LABELS: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri",
  LISENSI: "Lisensi",
};

const COLUMN_COUNT = 6;

export function MerkTable({ surface }: { surface: MerkSurface }) {
  const queryClient = useQueryClient();
  const listKey = ["merk-surface", surface.apiBase];

  const { data, isLoading, isError } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const response = await fetch(surface.apiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: MerkListItem[] };
      return json.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MerkStatusValue }) => {
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
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(
        variables.status === "ACTIVE" ? "Merek diaktifkan." : "Merek dinonaktifkan.",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status merek");
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{surface.title}</h1>
          {surface.description && (
            <p className="text-sm text-muted-foreground">{surface.description}</p>
          )}
        </div>
        <Button nativeButton={false} render={<Link href={surface.newHref} />}>
          {surface.newLabel}
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Merek</TableHead>
              <TableHead>Kategori Produk</TableHead>
              <TableHead>Negara Asal</TableHead>
              <TableHead>Kepemilikan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground">
                  Belum ada merek terdaftar.
                </TableCell>
              </TableRow>
            )}
            {data?.map((merk) => {
              const isActive = merk.status === "ACTIVE";
              const nextStatus: MerkStatusValue = isActive ? "INACTIVE" : "ACTIVE";
              const isPending =
                statusMutation.isPending && statusMutation.variables?.id === merk.id;
              return (
                <TableRow key={merk.id}>
                  <TableCell className="font-medium">{merk.brandName}</TableCell>
                  <TableCell>{merk.productCategory}</TableCell>
                  <TableCell>{merk.countryOfOrigin}</TableCell>
                  <TableCell>
                    {OWNERSHIP_LABELS[merk.ownershipType] ?? merk.ownershipType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isActive ? "default" : "secondary"}>{merk.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => statusMutation.mutate({ id: merk.id, status: nextStatus })}
                    >
                      {isPending ? "Menyimpan..." : isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    {surface.detailHrefBase && (
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`${surface.detailHrefBase}/${merk.id}`} />}
                      >
                        Detail
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
