"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { FileUploadField } from "@/components/form/file-upload-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommodityGroups } from "@/modules/master-data/use-commodity-groups";
import { EXPIRY_STATUS_CLASSES, EXPIRY_STATUS_LABELS, formatDate, getExpiryStatus } from "./expiry-status";

export type QualityTestRow = {
  id: string;
  brandId: string;
  brandName: string;
  companyName: string | null;
  /** Every Sub Kelompok Komoditas the certificate covers, comma-separated. */
  commodityName: string;
  coverageCount?: number;
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

type BrandOption = { id: string; brandName: string; status: string };

type Props = {
  fetchUrl: string;
  brandDetailHrefBase: string;
  showCompanyColumn?: boolean;
  /** When set, shows a "Tambah Dokumen" button that POSTs a new quality
   * test record to `fetchUrl` and fetches brand options from this URL
   * (an endpoint returning `{ data: { id, brandName, status }[] }`, e.g.
   * the admin `/api/merk` list). Omitted entirely for surfaces that
   * don't support creating quality tests directly from this table yet. */
  brandOptionsUrl?: string;
};

/** Shared Quality Test monitoring table (Admin platform-wide / Company
 * scoped) — kept as its own structured record with real columns, never
 * collapsed into a generic "attachment" list. */
export function QualityTestsTable({ fetchUrl, brandDetailHrefBase, showCompanyColumn = true, brandOptionsUrl }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [groupBy, setGroupBy] = useState<"none" | "brand" | "commodity">("none");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const queryKey = ["merk-management", "quality-tests", fetchUrl];
  const { data, isLoading, isError } = useQuery({
    queryKey,
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
          className={brandOptionsUrl ? "max-w-xs" : "ml-auto max-w-xs"}
        />
        {brandOptionsUrl && (
          <Button size="sm" className="ml-auto" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-3.5" />
            Tambah Dokumen
          </Button>
        )}
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
                  <TableCell>
                    {row.commodityName}
                    {(row.coverageCount ?? 1) > 1 && (
                      <span className="ml-1.5 inline-flex rounded-full bg-sky-500/10 px-1.5 text-[10.5px] font-semibold text-sky-700">
                        {row.coverageCount} Sub Kelompok
                      </span>
                    )}
                  </TableCell>
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

      {brandOptionsUrl && isAddOpen && (
        <AddQualityTestDialog
          postUrl={fetchUrl}
          brandOptionsUrl={brandOptionsUrl}
          onClose={() => setIsAddOpen(false)}
          onCreated={() => {
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey });
          }}
        />
      )}
    </div>
  );
}

function emptyQualityTestForm() {
  return {
    merkId: "",
    commodityGroupId: "",
    commodityName: "",
    commoditySubGroupId: "",
    commoditySubGroupName: "",
    certificateNumber: "",
    laboratoryName: "",
    issueDate: "",
    expiryDate: "",
    filePath: "",
    fileName: "",
  };
}

function AddQualityTestDialog({
  postUrl,
  brandOptionsUrl,
  onClose,
  onCreated,
}: {
  postUrl: string;
  brandOptionsUrl: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyQualityTestForm());
  const [isSaving, setIsSaving] = useState(false);
  const { groupOptions, subGroupOptionsFor } = useCommodityGroups();

  const { data: brandOptions } = useQuery({
    queryKey: ["merk-management", "brand-options", brandOptionsUrl],
    queryFn: async () => {
      const response = await fetch(brandOptionsUrl);
      if (!response.ok) throw new Error("Gagal memuat daftar merek");
      const json = (await response.json()) as { data: BrandOption[] };
      return json.data;
    },
  });
  const brandSelectOptions = useMemo(
    () =>
      (brandOptions ?? [])
        .filter((b) => b.status !== "DRAFT")
        .map((b) => ({ value: b.id, label: b.brandName })),
    [brandOptions],
  );

  const isValid =
    form.merkId && form.commodityGroupId && form.certificateNumber && form.laboratoryName && form.issueDate && form.filePath;

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkId: form.merkId,
          commodityGroupId: form.commodityGroupId,
          commodityName: form.commodityName,
          commoditySubGroupId: form.commoditySubGroupId || undefined,
          commoditySubGroupName: form.commoditySubGroupName || undefined,
          certificateNumber: form.certificateNumber,
          laboratoryName: form.laboratoryName,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate || undefined,
          filePath: form.filePath,
          fileName: form.fileName,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan dokumen hasil uji mutu");
      }
      toast.success("Dokumen hasil uji mutu berhasil ditambahkan.");
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan dokumen hasil uji mutu");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Dokumen Hasil Uji Mutu</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FormField label="Merek" required>
            <SearchSelectInput
              value={form.merkId}
              onChange={(value) => setForm((f) => ({ ...f, merkId: value }))}
              options={brandSelectOptions}
              allowFreeText={false}
              placeholder="Cari dan pilih merek"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sub Kelompok Komoditas" required>
              <SearchSelectInput
                value={form.commodityGroupId}
                onChange={(value) => {
                  const option = groupOptions.find((o) => o.value === value);
                  setForm((f) => ({
                    ...f,
                    commodityGroupId: value,
                    commodityName: option?.label ?? "",
                    commoditySubGroupId: "",
                    commoditySubGroupName: "",
                  }));
                }}
                options={groupOptions}
                allowFreeText={false}
                placeholder="Pilih sub kelompok komoditas"
              />
            </FormField>
            <FormField label="Komoditas" hint="Opsional">
              <SearchSelectInput
                value={form.commoditySubGroupId}
                onChange={(value) => {
                  const option = subGroupOptionsFor(form.commodityGroupId).find((o) => o.value === value);
                  setForm((f) => ({ ...f, commoditySubGroupId: value, commoditySubGroupName: option?.label ?? "" }));
                }}
                options={subGroupOptionsFor(form.commodityGroupId)}
                allowFreeText={false}
                placeholder="Opsional"
              />
            </FormField>
          </div>
          <FormField label="Nomor Sertifikat" required>
            <Input
              value={form.certificateNumber}
              onChange={(event) => setForm((f) => ({ ...f, certificateNumber: event.target.value }))}
            />
          </FormField>
          <FormField label="Nama Laboratorium" required>
            <Input
              value={form.laboratoryName}
              onChange={(event) => setForm((f) => ({ ...f, laboratoryName: event.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Terbit" required>
              <Input
                type="date"
                className="font-mono"
                value={form.issueDate}
                onChange={(event) => setForm((f) => ({ ...f, issueDate: event.target.value }))}
              />
            </FormField>
            <FormField label="Tanggal Kadaluarsa" hint="Opsional">
              <Input
                type="date"
                className="font-mono"
                value={form.expiryDate}
                onChange={(event) => setForm((f) => ({ ...f, expiryDate: event.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Dokumen Hasil Uji Mutu" required>
            <FileUploadField
              namespace="documents"
              value={form.filePath}
              onChange={(path) => setForm((f) => ({ ...f, filePath: path ?? "", fileName: path ? path.split("/").pop() ?? "" : "" }))}
              label="Unggah Dokumen Hasil Uji Mutu"
              hint="Format: PDF, JPG, PNG"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
