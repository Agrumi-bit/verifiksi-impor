"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandDocumentCategory } from "@/modules/merk/document-requirements";
import { EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS, formatDate, getExpiryStatus } from "./expiry-status";

export type BrandDocumentRow = {
  id: string;
  brandId: string;
  brandName: string;
  companyName: string | null;
  documentType: string;
  category: string;
  fileName: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
};

const TABS = [
  { key: "all", label: "Semua Dokumen", categories: null },
  { key: "trademark", label: "Dokumen Merek", categories: ["trademark"] },
  { key: "representation", label: "Dokumen Perwakilan", categories: ["representation", "official_representative_legal"] },
  { key: "import_authorization", label: "Penunjukan Importir", categories: ["import_authorization"] },
  { key: "product_compliance", label: "Product Compliance", categories: ["product_compliance"] },
  { key: "expiring", label: "Kedaluwarsa", categories: null },
] as const satisfies readonly { key: string; label: string; categories: readonly BrandDocumentCategory[] | null }[];

type Props = {
  fetchUrl: string;
  brandDetailHrefBase: string;
  /** Company surface hides its own name column — every row is already this
   * company's own document. */
  showCompanyColumn?: boolean;
};

/** Shared table behind both Admin's "Dokumen" page and Company Workspace's
 * own "Dokumen" page — same tabs/columns, `fetchUrl` picks the scope. Upload
 * status only; never "Verified" (no verification workflow on this model). */
export function BrandDocumentsTable({ fetchUrl, brandDetailHrefBase, showCompanyColumn = true }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "documents", fetchUrl],
    queryFn: async () => {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Gagal memuat dokumen merek");
      const json = (await response.json()) as { data: BrandDocumentRow[] };
      return json.data;
    },
  });

  const activeTab = TABS.find((t) => t.key === tab)!;

  const rows = useMemo(() => {
    let list = data ?? [];
    if (activeTab.categories) {
      list = list.filter((row) => (activeTab.categories as readonly string[]).includes(row.category));
    }
    if (activeTab.key === "expiring") {
      list = list.filter((row) => {
        const status = getExpiryStatus(row.expiryDate);
        return status === "expiring_soon" || status === "expired";
      });
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.brandName.toLowerCase().includes(term) ||
          row.fileName.toLowerCase().includes(term) ||
          row.companyName?.toLowerCase().includes(term),
      );
    }
    return list;
  }, [data, activeTab, search]);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value as (typeof TABS)[number]["key"])}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            {TABS.map((t) => (
              <TabsTab key={t.key} value={t.key}>
                {t.label}
              </TabsTab>
            ))}
          </TabsList>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari dokumen atau merek..."
            className="ml-auto max-w-xs"
          />
        </div>

        {TABS.map((t) => (
          <TabsPanel key={t.key} value={t.key}>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Brand</TableHead>
                    {showCompanyColumn && <TableHead>Company</TableHead>}
                    <TableHead>Category</TableHead>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Upload Status</TableHead>
                    <TableHead>Status / Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={showCompanyColumn ? 9 : 8} className="text-center text-muted-foreground">
                        Memuat...
                      </TableCell>
                    </TableRow>
                  )}
                  {isError && (
                    <TableRow>
                      <TableCell colSpan={showCompanyColumn ? 9 : 8} className="text-center text-destructive">
                        Gagal memuat data.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={showCompanyColumn ? 9 : 8} className="text-center text-muted-foreground">
                        Tidak ada dokumen.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => {
                    const status = getExpiryStatus(row.expiryDate);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[220px] truncate font-medium" title={row.fileName}>
                          {row.fileName}
                        </TableCell>
                        <TableCell>
                          <Link href={`${brandDetailHrefBase}/${row.brandId}`} className="hover:underline">
                            {row.brandName}
                          </Link>
                        </TableCell>
                        {showCompanyColumn && <TableCell>{row.companyName ?? "—"}</TableCell>}
                        <TableCell className="text-xs text-muted-foreground">{row.category}</TableCell>
                        <TableCell>{row.documentNumber ?? "—"}</TableCell>
                        <TableCell>{formatDate(row.issueDate)}</TableCell>
                        <TableCell>{formatDate(row.expiryDate)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Diunggah</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>
                            {EXPIRY_STATUS_LABELS[status]}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}
