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

type ApplicationListItem = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  companyName: string;
  status: string;
  createdAt: string;
};

export function ApplicationTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const response = await fetch("/api/applications");
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      const json = (await response.json()) as { data: ApplicationListItem[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Application List</h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh permohonan verifikasi yang telah disubmit.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/applications/new" />}>
          + Create New Application
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Aplikasi</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada permohonan yang disubmit.
                </TableCell>
              </TableRow>
            )}
            {data?.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-mono text-xs">
                  {application.applicationNumber}
                </TableCell>
                <TableCell className="font-medium">{application.companyName}</TableCell>
                <TableCell>{application.verificationType}</TableCell>
                <TableCell>{application.applicationCategory}</TableCell>
                <TableCell>
                  <Badge>{application.status}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(application.createdAt).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/applications/${application.id}`} />}
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
