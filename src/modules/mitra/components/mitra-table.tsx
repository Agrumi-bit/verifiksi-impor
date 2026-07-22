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
import { MITRA_TYPE_LABELS, type MitraType } from "../schema";

type MitraListItem = {
  id: string;
  name: string;
  nibNumber: string;
  city: string;
  status: string;
};

type Props = {
  type: MitraType;
};

export function MitraTable({ type }: Props) {
  const basePath = type === "INDUSTRI" ? "/mitra/industri" : "/mitra/non-industri";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mitra", type],
    queryFn: async () => {
      const response = await fetch(`/api/mitra?type=${type}`);
      if (!response.ok) throw new Error("Gagal memuat data mitra");
      const json = (await response.json()) as { data: MitraListItem[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{MITRA_TYPE_LABELS[type]}</h1>
        <Button nativeButton={false} render={<Link href={`${basePath}/new`} />}>
          + Tambah {MITRA_TYPE_LABELS[type]}
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>NIB</TableHead>
              <TableHead>Kota</TableHead>
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
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
            {data?.map((mitra) => (
              <TableRow key={mitra.id}>
                <TableCell className="font-medium">{mitra.name}</TableCell>
                <TableCell>{mitra.nibNumber}</TableCell>
                <TableCell>{mitra.city}</TableCell>
                <TableCell>
                  <Badge variant={mitra.status === "ACTIVE" ? "default" : "secondary"}>
                    {mitra.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`${basePath}/${mitra.id}`} />}
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
