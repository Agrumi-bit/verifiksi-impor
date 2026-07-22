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

type CompanyListItem = {
  id: string;
  companyName: string;
  companyType: string;
  investmentStatus: string;
  status: string;
};

export function CompanyTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Gagal memuat data perusahaan");
      const json = (await response.json()) as { data: CompanyListItem[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Company Registry</h1>
        <Button nativeButton={false} render={<Link href="/company/new" />}>
          + Add New Company
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>Jenis Badan Usaha</TableHead>
              <TableHead>Status Investasi</TableHead>
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
                  Belum ada perusahaan terdaftar.
                </TableCell>
              </TableRow>
            )}
            {data?.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.companyName}</TableCell>
                <TableCell>{company.companyType}</TableCell>
                <TableCell>{company.investmentStatus}</TableCell>
                <TableCell>
                  <Badge variant={company.status === "ACTIVE" ? "default" : "secondary"}>
                    {company.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/company/${company.id}`} />}
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
