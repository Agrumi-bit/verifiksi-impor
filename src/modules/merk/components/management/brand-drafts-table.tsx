"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import type { MerkSurface } from "@/modules/merk/surface";
import { formatDate } from "./expiry-status";

type DraftRow = {
  brandId: string;
  brandName: string;
  companyName: string | null;
  lastStep: string;
  completeness: number;
  updatedAt: string;
};

type Props = {
  surface: MerkSurface;
  fetchUrl: string;
  showCompanyColumn?: boolean;
};

/** Draft list for both Admin and Company Workspace. "Lanjutkan Pengisian"
 * reopens the existing Add Brand Wizard with the Draft's data restored
 * (`MerkWizard`'s `draftId` prop) — there is intentionally no "Complete" →
 * direct ACTIVE shortcut; a Draft only becomes ACTIVE by finishing the
 * wizard through Step 5's declaration. Delete Draft is not implemented —
 * there is no delete endpoint for a Merk row (see the navigation report). */
export function BrandDraftsTable({ surface, fetchUrl, showCompanyColumn = true }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "drafts", fetchUrl],
    queryFn: async () => {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Gagal memuat draft merek");
      const json = (await response.json()) as { data: DraftRow[] };
      return json.data;
    },
  });

  const columnCount = showCompanyColumn ? 6 : 5;

  return (
    <div className="flex flex-col gap-4">
      {editingId && (
        <MerkWizard surface={surface} draftId={editingId} onClose={() => setEditingId(null)} />
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              {showCompanyColumn && <TableHead>Company</TableHead>}
              <TableHead>Last Completed Step</TableHead>
              <TableHead>Completeness</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                  Gagal memuat data.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  Tidak ada draft merek.
                </TableCell>
              </TableRow>
            )}
            {data?.map((draft) => (
              <TableRow key={draft.brandId}>
                <TableCell className="font-medium">{draft.brandName || "Merek belum diberi nama"}</TableCell>
                {showCompanyColumn && <TableCell>{draft.companyName ?? "—"}</TableCell>}
                <TableCell>{draft.lastStep}</TableCell>
                <TableCell>{draft.completeness}%</TableCell>
                <TableCell>{formatDate(draft.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(draft.brandId)}>
                    Lanjutkan Pengisian
                  </Button>
                  {surface.detailHrefBase && (
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`${surface.detailHrefBase}/${draft.brandId}`} />}>
                      Lihat
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
