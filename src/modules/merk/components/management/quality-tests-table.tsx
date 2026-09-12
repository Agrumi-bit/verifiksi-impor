"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS, formatDate, getExpiryStatus } from "./expiry-status";

export type QualityTestRow = {
  id: string;
  brandId: string;
  brandName: string;
  companyName: string | null;
  commodityName: string;
  commoditySubGroupName: string | null;
  certificateNumber: string;
  laboratoryName: string;
  issueDate: string;
  expiryDate: string | null;
};

const TABS = [
  { key: "all", label: "Semua Hasil Uji" },
  { key: "expiring", label: "Akan Kedaluwarsa" },
  { key: "expired", label: "Kedaluwarsa" },
] as const;

type Props = {
  fetchUrl: string;
  brandDetailHrefBase: string;
  showCompanyColumn?: boolean;
};

/** Shared Quality Test monitoring table (Admin platform-wide / Company
 * scoped) — kept as its own structured record with real columns, never
 * collapsed into a generic "attachment" list. */
export function QualityTestsTable({ fetchUrl, brandDetailHrefBase, showCompanyColumn = true }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [groupBy, setGroupBy] = useState<"none" | "brand" | "commodity">("none");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "quality-tests", fetchUrl],
    queryFn: async () => {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Gagal memuat hasil uji mutu");
      const json = (await response.json()) as { data: QualityTestRow[] };
      return json.data;
    },
  });

  const rows = useMemo(() => {
    let list = data ?? [];
    if (tab !== "all") {
      list = list.filter((row) => getExpiryStatus(row.expiryDate) === (tab === "expiring" ? "expiring_soon" : "expired"));
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.brandName.toLowerCase().includes(term) ||
          row.commodityName.toLowerCase().includes(term) ||
          row.laboratoryName.toLowerCase().includes(term) ||
          row.certificateNumber.toLowerCase().includes(term),
      );
    }
    const sorted = [...list];
    if (groupBy === "brand") sorted.sort((a, b) => a.brandName.localeCompare(b.brandName));
    if (groupBy === "commodity") sorted.sort((a, b) => a.commodityName.localeCompare(b.commodityName));
    return sorted;
  }, [data, tab, groupBy, search]);

  const columnCount = showCompanyColumn ? 8 : 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                : "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
            }
          >
            {t.label}
          </button>
        ))}
        <NativeSelect
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}
          className="w-auto"
        >
          <option value="none">Urutan: Terbaru</option>
          <option value="brand">Kelompokkan per Merek</option>
          <option value="commodity">Kelompokkan per Komoditas</option>
        </NativeSelect>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari merek, komoditas, laboratorium..."
          className="ml-auto max-w-xs"
        />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              {showCompanyColumn && <TableHead>Company</TableHead>}
              <TableHead>Commodity</TableHead>
              <TableHead>Subcommodity</TableHead>
              <TableHead>Certificate Number</TableHead>
              <TableHead>Laboratory</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Valid Until / Status</TableHead>
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
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  Tidak ada hasil uji mutu.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const status = getExpiryStatus(row.expiryDate);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`${brandDetailHrefBase}/${row.brandId}`} className="hover:underline">
                      {row.brandName}
                    </Link>
                  </TableCell>
                  {showCompanyColumn && <TableCell>{row.companyName ?? "—"}</TableCell>}
                  <TableCell>{row.commodityName}</TableCell>
                  <TableCell>{row.commoditySubGroupName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{row.certificateNumber}</TableCell>
                  <TableCell>{row.laboratoryName}</TableCell>
                  <TableCell>{formatDate(row.issueDate)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{formatDate(row.expiryDate)}</span>
                      <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRY_STATUS_CLASSES[status]}`}>
                        {EXPIRY_STATUS_LABELS[status]}
                      </span>
                    </div>
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
