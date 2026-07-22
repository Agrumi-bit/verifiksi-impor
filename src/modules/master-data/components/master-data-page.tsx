"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { MasterDataFormDialog } from "./master-data-form-dialog";
import type { MasterDataColumn, MasterDataField, MasterDataRow } from "../types";

type Props = {
  title: string;
  description?: string;
  apiPath: string;
  queryKey: string;
  columns: MasterDataColumn[];
  fields: MasterDataField[];
  addButtonLabel?: string;
};

function cellValue(row: MasterDataRow, column: MasterDataColumn): string {
  if (column.render) return column.render(row);
  const value = row[column.key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

export function MasterDataPage({
  title,
  description,
  apiPath,
  queryKey,
  columns,
  fields,
  addButtonLabel,
}: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterDataRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await fetch(apiPath);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: MasterDataRow[] };
      return json.data;
    },
  });

  function openAddDialog() {
    setEditingRow(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(row: MasterDataRow) {
    setEditingRow(row);
    setIsDialogOpen(true);
  }

  async function handleSubmit(values: Record<string, string>) {
    const isEdit = Boolean(editingRow);
    const url = isEdit ? `${apiPath}/${editingRow!.id}` : apiPath;
    const response = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan data");
      throw new Error("submit-failed");
    }
    toast.success(isEdit ? "Data berhasil diperbarui." : "Data berhasil ditambahkan.");
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }

  async function toggleStatus(row: MasterDataRow) {
    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(`${apiPath}/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(
      nextStatus === "INACTIVE" ? "Data dinonaktifkan." : "Data diaktifkan kembali.",
    );
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button onClick={openAddDialog}>
          + {addButtonLabel ?? `Tambah ${title}`}
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center text-muted-foreground"
                >
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center text-destructive"
                >
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center text-muted-foreground"
                >
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
            {data?.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{cellValue(row, column)}</TableCell>
                ))}
                <TableCell>
                  <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(row)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(row)}>
                      {row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MasterDataFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingRow ? `Edit ${title}` : addButtonLabel ?? `Tambah ${title}`}
        fields={fields}
        initialValues={editingRow}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
