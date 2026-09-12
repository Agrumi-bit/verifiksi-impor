"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
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
import { MerkWizard } from "./merk-wizard";

type MerkListItem = {
  id: string;
  brandName: string;
  productCategory: string;
  countryOfOrigin: string;
  ownershipType: string;
  ownerTitle: string | null;
  companyName: string | null;
  completenessPercent: number;
  registrationNumber: string | null;
  trademarkClass: string | null;
  status: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Tidak Aktif" },
  { value: "DRAFT", label: "Draft" },
];

function completenessTone(percent: number): string {
  if (percent >= 100) return "text-emerald-600";
  if (percent >= 50) return "text-amber-600";
  return "text-destructive";
}

export function MerkTable({ surface }: { surface: MerkSurface }) {
  const queryClient = useQueryClient();
  const listKey = ["merk-surface", surface.apiBase];
  // "new" opens a blank wizard; a brand id reopens that brand's data into
  // the wizard — used both to continue a Draft and to Edit an existing
  // brand (see BR-002 in the Add Brand review: the same restore mechanism
  // works for either).
  const [wizardTarget, setWizardTarget] = useState<"new" | string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const rows = useMemo(() => {
    let list = data ?? [];
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.brandName.toLowerCase().includes(term) ||
          m.ownerTitle?.toLowerCase().includes(term) ||
          m.companyName?.toLowerCase().includes(term) ||
          m.registrationNumber?.toLowerCase().includes(term),
      );
    }
    return list;
  }, [data, statusFilter, search]);

  const columnCount = surface.showCompanyColumn ? 8 : 7;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{surface.title}</h1>
          {surface.description && (
            <p className="text-sm text-muted-foreground">{surface.description}</p>
          )}
        </div>
        <Button onClick={() => setWizardTarget("new")}>{surface.newLabel}</Button>
      </div>

      {wizardTarget && (
        <MerkWizard
          surface={surface}
          draftId={wizardTarget === "new" ? undefined : wizardTarget}
          onClose={() => setWizardTarget(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama merek, pemilik, atau nomor..."
          className="max-w-xs"
        />
        <NativeSelect
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-auto"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merek</TableHead>
              <TableHead>Pemilik Merek</TableHead>
              <TableHead>Negara</TableHead>
              {surface.showCompanyColumn && <TableHead>Perusahaan</TableHead>}
              <TableHead>Kelas Merek</TableHead>
              <TableHead>No. Sertifikat / Pendaftaran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kelengkapan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {data?.length === 0 ? "Belum ada merek terdaftar." : "Tidak ada merek yang cocok dengan filter."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((merk) => {
              const isActive = merk.status === "ACTIVE";
              const isDraft = merk.status === "DRAFT";
              const nextStatus: MerkStatusValue = isActive ? "INACTIVE" : "ACTIVE";
              const isPending =
                statusMutation.isPending && statusMutation.variables?.id === merk.id;
              return (
                <TableRow key={merk.id}>
                  <TableCell className="font-medium">{merk.brandName}</TableCell>
                  <TableCell>{merk.ownerTitle ?? "—"}</TableCell>
                  <TableCell>{merk.countryOfOrigin}</TableCell>
                  {surface.showCompanyColumn && <TableCell>{merk.companyName ?? "—"}</TableCell>}
                  <TableCell>{merk.trademarkClass ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{merk.registrationNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={isActive ? "default" : isDraft ? "outline" : "secondary"}>
                      {merk.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold ${completenessTone(merk.completenessPercent)}`}>
                      {merk.completenessPercent}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {isDraft ? (
                      <Button variant="ghost" size="sm" onClick={() => setWizardTarget(merk.id)}>
                        Lanjutkan
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => statusMutation.mutate({ id: merk.id, status: nextStatus })}
                        >
                          {isPending ? "Menyimpan..." : isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setWizardTarget(merk.id)}>
                          Edit
                        </Button>
                      </>
                    )}
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
