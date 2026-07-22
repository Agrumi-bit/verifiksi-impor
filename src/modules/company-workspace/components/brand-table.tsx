"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BrandListItem = {
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

export function CompanyBrandTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "brands"],
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/brands");
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: BrandListItem[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Brand Management</h1>
          <p className="text-sm text-muted-foreground">
            Daftar merek produk tekstil yang terdaftar untuk perusahaan Anda.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/company-workspace/supporting/brands/new" />}>
          + Register New Brand
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
                  Gagal memuat data merek.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada merek terdaftar. Klik &quot;Register New Brand&quot; untuk menambahkan.
                </TableCell>
              </TableRow>
            )}
            {data?.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.brandName}</TableCell>
                <TableCell>{brand.productCategory}</TableCell>
                <TableCell>{brand.countryOfOrigin}</TableCell>
                <TableCell>
                  {OWNERSHIP_LABELS[brand.ownershipType] ?? brand.ownershipType}
                </TableCell>
                <TableCell>
                  <Badge variant={brand.status === "ACTIVE" ? "default" : "secondary"}>
                    {brand.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
