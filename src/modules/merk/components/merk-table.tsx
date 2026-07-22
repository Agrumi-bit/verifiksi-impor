"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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

type MerkListItem = {
  id: string;
  brandName: string;
  productCategory: string;
  ownershipType: string;
  status: string;
};

const OWNERSHIP_LABELS: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri",
  LISENSI: "Lisensi",
};

export function MerkTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk"],
    queryFn: async () => {
      const response = await fetch("/api/merk");
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: MerkListItem[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Merk</h1>
        <Button nativeButton={false} render={<Link href="/mitra/merk/new" />}>
          + Tambah Merek
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Merek</TableHead>
              <TableHead>Kategori Produk</TableHead>
              <TableHead>Kepemilikan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada merek terdaftar.
                </TableCell>
              </TableRow>
            )}
            {data?.map((merk) => (
              <TableRow key={merk.id}>
                <TableCell className="font-medium">{merk.brandName}</TableCell>
                <TableCell>{merk.productCategory}</TableCell>
                <TableCell>{OWNERSHIP_LABELS[merk.ownershipType] ?? merk.ownershipType}</TableCell>
                <TableCell>
                  <Badge variant={merk.status === "ACTIVE" ? "default" : "secondary"}>
                    {merk.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/mitra/merk/${merk.id}`} />}
                  >
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
