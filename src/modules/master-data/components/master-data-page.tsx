"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { MasterDataFormDialog, type FormNotice } from "./master-data-form-dialog";
import type { MasterDataColumn, MasterDataField, MasterDataFilter, MasterDataRow } from "../types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type SortDirection = "asc" | "desc";

type Props = {
  title: string;
  description?: string;
  apiPath: string;
  queryKey: string;
  columns: MasterDataColumn[];
  fields: MasterDataField[];
  addButtonLabel?: string;
  requireReasonOnDeactivate?: boolean;
  /** Extra buttons rendered next to "+ Tambah" — e.g. Excel import/export, when a page needs it. */
  headerActions?: ReactNode;
  /** See MasterDataFormDialog's `formNotice`. */
  formNotice?: FormNotice;
  /** Dropdown filters rendered next to the search box, applied together with the search. */
  filters?: MasterDataFilter[];
  /** Shows a "Hapus" button per row (permanent delete, confirmed in a dialog). The API refuses with
   * a reason when the row is still referenced — that message is shown as-is. */
  allowDelete?: boolean;
};

function cellValue(row: MasterDataRow, column: MasterDataColumn): string {
  if (column.render) return column.render(row);
  const value = row[column.key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

function rowMatchesSearch(row: MasterDataRow, columns: MasterDataColumn[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return columns.some((column) => cellValue(row, column).toLowerCase().includes(q));
}

export function MasterDataPage({
  title,
  description,
  apiPath,
  queryKey,
  columns,
  fields,
  addButtonLabel,
  requireReasonOnDeactivate,
  headerActions,
  formNotice,
  filters,
  allowDelete,
}: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterDataRow | null>(null);
  const [search, setSearch] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<MasterDataRow | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<MasterDataRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const hasActiveFilter = Object.values(filterValues).some(Boolean) || search.trim() !== "";

  const { data, isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await fetch(apiPath);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: MasterDataRow[] };
      return json.data;
    },
  });

  const rows = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowMatchesSearch(row, columns, search) &&
          (filters ?? []).every((filter) => !filterValues[filter.key] || filter.getValue(row) === filterValues[filter.key]),
      ),
    [rows, columns, search, filters, filterValues],
  );

  const sortColumn = columns.find((c) => c.key === sortKey);
  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = cellValue(a, sortColumn).localeCompare(cellValue(b, sortColumn), "id", {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize],
  );

  function toggleSort(key: string) {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey(null);
    setSortDirection("asc");
  }

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

  async function setStatus(rowId: string, status: "ACTIVE" | "INACTIVE", reason?: string) {
    const response = await fetch(`${apiPath}/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        status === "INACTIVE" ? { status, deactivationReason: reason ?? "" } : { status },
      ),
    });
    if (!response.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(status === "INACTIVE" ? "Data dinonaktifkan." : "Data diaktifkan kembali.");
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }

  async function toggleStatus(row: MasterDataRow) {
    if (row.status === "ACTIVE") {
      if (requireReasonOnDeactivate) {
        setDeactivateTarget(row);
        setDeactivateReason("");
        return;
      }
      await setStatus(row.id, "INACTIVE");
      return;
    }
    await setStatus(row.id, "ACTIVE");
  }

  async function confirmDeactivate() {
    if (!deactivateTarget || !deactivateReason.trim()) return;
    setIsDeactivating(true);
    try {
      await setStatus(deactivateTarget.id, "INACTIVE", deactivateReason.trim());
      setDeactivateTarget(null);
      setDeactivateReason("");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${apiPath}/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal menghapus data");
        return;
      }
      toast.success("Data berhasil dihapus.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    } finally {
      setIsDeleting(false);
    }
  }

  const gridTemplate = `repeat(${columns.length}, 1fr) 0.8fr 0.9fr`;

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">{title}</div>
          {description && (
            <p className="mt-1 max-w-[560px] text-[13px] text-[#8a7565]">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={openAddDialog}
            className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            + {addButtonLabel ?? `Tambah ${title}`}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={`Cari ${title.toLowerCase()}...`}
          className="min-w-60 flex-1 rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
        />
        {filters?.map((filter) => {
          const parentValue = filter.dependsOn ? filterValues[filter.dependsOn] : "";
          const options = parentValue && filter.optionsFor ? filter.optionsFor(parentValue) : filter.options;
          return (
          <label key={filter.key} className="flex flex-col gap-1 text-[11px] font-semibold text-[#8a7565]">
            {filter.label}
            <select
              value={filterValues[filter.key] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setFilterValues((prev) => {
                  const next = { ...prev, [filter.key]: value };
                  for (const child of filters.filter((f) => f.dependsOn === filter.key)) next[child.key] = "";
                  return next;
                });
                setPage(1);
              }}
              className="min-w-44 max-w-72 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-2 text-[12.5px] font-normal text-[#261813] outline-none focus:border-[#e0662e]"
            >
              <option value="">Semua</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          );
        })}
        {filters && filters.length > 0 && hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setFilterValues({});
              setSearch("");
              setPage(1);
            }}
            className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-2 text-[12px] font-semibold text-[#261813]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mb-3.5 flex items-center justify-between text-[13px] text-[#8a7565]">
        <span>
          {filtered.length} dari {rows.length} data ditemukan
        </span>
        <label className="flex items-center gap-2">
          Tampilkan
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-[#e1bfb3] bg-white px-2 py-1 text-[12.5px] text-[#261813] outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          data
        </label>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
        <div
          className="grid gap-3 px-[18px] py-3 text-[11px] font-bold tracking-[0.03em] text-white"
          style={{ gridTemplateColumns: gridTemplate, background: "#e0662e" }}
        >
          {columns.map((column) => (
            <button
              key={column.key}
              type="button"
              onClick={() => toggleSort(column.key)}
              className="flex items-center gap-1 text-left uppercase"
            >
              {column.label.toUpperCase()}
              {sortKey === column.key ? (
                sortDirection === "asc" ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )
              ) : (
                <ChevronsUpDown className="size-3.5 opacity-50" />
              )}
            </button>
          ))}
          <div>STATUS</div>
          <div className="text-right">AKSI</div>
        </div>

        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && (
          <p className="p-6 text-center text-[13px] text-[#ba1a1a]">
            Gagal memuat data. Pastikan database sudah terhubung.
          </p>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="p-6 text-center text-[13px] text-[#8a7565]">
            {rows.length === 0 ? "Belum ada data." : "Tidak ada data yang cocok dengan pencarian atau filter."}
          </p>
        )}

        {paginated.map((row) => {
          const isActive = row.status === "ACTIVE";
          return (
            <div
              key={row.id}
              className="grid items-center gap-3 border-t border-[#f5ebe1] px-[18px] py-3.5"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((column, index) => (
                <div
                  key={column.key}
                  className={
                    index === 0
                      ? "text-[12.5px] font-bold text-[#261813]"
                      : "text-[12.5px] text-[#4a4038]"
                  }
                >
                  {cellValue(row, column)}
                </div>
              ))}
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStatus(row)}
                    className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                    style={{ background: isActive ? "#1a7a4c" : "#d8c9bd" }}
                    aria-label={isActive ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <span
                      className="absolute top-0.5 size-4 rounded-full bg-white transition-all"
                      style={{ left: isActive ? "18px" : "2px" }}
                    />
                  </button>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: isActive ? "#1a7a4c" : "#8a7565" }}
                  >
                    {isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                {!isActive && typeof row.deactivationReason === "string" && row.deactivationReason && (
                  <div className="mt-1 max-w-[150px] truncate text-[10.5px] text-[#a68f80]" title={row.deactivationReason}>
                    {row.deactivationReason}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditDialog(row)}
                  className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                >
                  Edit
                </button>
                {allowDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-lg border border-[#dc2626] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#dc2626]"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#f5ebe1] px-4.5 py-3">
            <span className="text-[12.5px] text-[#8a7565]">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813] disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      <MasterDataFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingRow ? `Edit ${title}` : addButtonLabel ?? `Tambah ${title}`}
        fields={fields}
        initialValues={editingRow}
        onSubmit={handleSubmit}
        formNotice={formNotice}
      />

      {deleteTarget && (
        <div
          onClick={() => !isDeleting && setDeleteTarget(null)}
          style={{ background: "rgba(43,36,32,.45)" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div onClick={(event) => event.stopPropagation()} className="w-105 max-w-[92vw] rounded-2xl bg-white p-7">
            <div className="mb-1.5 text-[16px] font-extrabold text-[#2b2420]">Hapus {title}</div>
            <p className="mb-1 text-[13px] font-semibold text-[#261813]">{cellValue(deleteTarget, columns[0])}</p>
            <p className="text-[13px] text-[#8a7565]">
              Data akan dihapus permanen dan tidak dapat dikembalikan. Jika hanya tidak dipakai lagi, gunakan
              tombol Nonaktif.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-[#ba1a1a] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div
          onClick={() => setDeactivateTarget(null)}
          style={{ background: "rgba(43,36,32,.45)" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-7"
          >
            <div className="mb-1.5 text-[16px] font-extrabold text-[#2b2420]">Nonaktifkan {title}</div>
            <p className="mb-4 text-[13px] text-[#8a7565]">
              {cellValue(deactivateTarget, columns[0])}
            </p>
            <label className="mb-1.5 block text-[12px] font-semibold text-[#594138]">
              Alasan Menonaktifkan <span className="text-[#ba1a1a]">*</span>
            </label>
            <textarea
              value={deactivateReason}
              onChange={(event) => setDeactivateReason(event.target.value)}
              placeholder={`Tuliskan alasan menonaktifkan ${title.toLowerCase()} ini...`}
              className="min-h-20 w-full resize-y rounded-lg border border-[#e8d5c5] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={isDeactivating}
                className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeactivate}
                disabled={isDeactivating || !deactivateReason.trim()}
                className="rounded-lg bg-[#ba1a1a] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {isDeactivating ? "Menyimpan..." : "Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
