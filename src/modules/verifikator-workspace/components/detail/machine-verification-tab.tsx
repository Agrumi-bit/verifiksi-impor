"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { RichTextEditor } from "@/components/form/rich-text-editor";
import { MACHINE_VERIFICATION_STATUS_BADGE, MACHINE_VERIFICATION_STATUS_LABELS, type MachineVerificationStatusValue } from "../../status";
import type { AssignmentStatusValue } from "../../status";
import { MACHINE_KONDISI_LABELS, MACHINE_KONDISI_VALUES, type MachineKondisiValue } from "@/modules/applications/schema";

/** Indonesian number format: "." is the thousands separator, "," is the decimal separator. */
function parseNum(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/-?[\d.,]+/);
  if (!match) return null;
  const n = Number(match[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtNum(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

type MachineRow = {
  id: string;
  nama: string;
  proses: string;
  merk: string;
  model: string;
  tahun: string;
  quantity: string;
  quantitySatuan: string;
  kapasitas: string;
  kapasitasSatuan: string;
  kapasitasJam: string;
  kapasitasJamSatuan: string;
  waktuBeroperasi: string;
  kapasitasPerHari: string;
  hariEfektifPerTahun: string;
  kapasitasPerTahun: string;
  kondisi: MachineKondisiValue | "";
  power: string;
  powerSatuan: string;
  input: string;
  output: string;
  photoMesinPath: string | null;
  originalPhotoMesinPath: string | null;
  photoMesinPaths: string[];
  status: MachineVerificationStatusValue;
  note: string;
  jumlahTerpasang: string;
  jumlahTidakAktif: string;
  keteranganJumlah: string;
  verifiedAt: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">{label}</div>
      <div className="rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

/** E-commerce-style product photo gallery: large cover image + clickable thumbnail strip. */
function MachinePhotoGallery({
  row,
  canEdit,
  onAddPhoto,
  onSetCover,
  onRemovePhoto,
}: {
  row: MachineRow;
  canEdit: boolean;
  onAddPhoto: (path: string) => void;
  onSetCover: (path: string) => void;
  onRemovePhoto: (path: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  // The applicant's original photo is always shown first and can never be removed —
  // verifikator-added photos (`photoMesinPaths`) follow, deduped against it.
  const gallery = [
    ...(row.originalPhotoMesinPath ? [row.originalPhotoMesinPath] : []),
    ...row.photoMesinPaths.filter((p) => p !== row.originalPhotoMesinPath),
  ];
  const cover = row.photoMesinPath || gallery[0] || null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "photos");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const uploaded = (await response.json()) as { path: string };
      onAddPhoto(uploaded.path);
    } catch {
      toast.error("Gagal mengunggah foto, coba lagi.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      {cover ? (
        <a href={fileHref(cover)} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileHref(cover)} alt={row.proses} className="mb-2.5 aspect-[1.3] w-full rounded-lg border border-[#e8dccd] object-cover" />
        </a>
      ) : (
        <div className="mb-2.5 flex aspect-[1.3] w-full items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[10.5px] text-[#5a7a63]">
          Belum ada foto
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {gallery.map((path) => {
          const isOriginal = path === row.originalPhotoMesinPath;
          const isCover = path === cover;
          return (
            <div key={path} className="group relative">
              <button
                type="button"
                onClick={() => onSetCover(path)}
                className="block size-14 shrink-0 overflow-hidden rounded-lg border-2"
                style={{ borderColor: isCover ? "#2f6fe0" : "#e8dccd" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(path)} alt="" className="size-full object-cover" />
              </button>
              {isOriginal && (
                <span className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#20180f] px-1.5 py-px text-[8px] font-bold text-white">
                  Asli
                </span>
              )}
              {canEdit && !isOriginal && (
                <button
                  type="button"
                  onClick={() => onRemovePhoto(path)}
                  aria-label="Hapus foto"
                  className="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-[#dc2626] text-white opacity-0 group-hover:opacity-100"
                >
                  <MaterialIcon name="close" className="text-[11px]" />
                </button>
              )}
            </div>
          );
        })}
        {canEdit && (
          <label
            className={`flex size-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-[#c8dbc9] text-[#5a7a63] ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <MaterialIcon name={isUploading ? "hourglass_empty" : "add_a_photo"} className="text-[16px]" />
            <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </label>
        )}
      </div>
    </div>
  );
}

type MachineDataDraft = {
  nama?: string;
  proses?: string;
  merk?: string;
  model?: string;
  tahun?: string;
  jumlah?: string;
  jumlahSatuan?: string;
  kapasitas?: string;
  kapasitasSatuan?: string;
  kapasitasJam?: string;
  kapasitasJamSatuan?: string;
  waktuBeroperasi?: string;
  hariEfektifPerTahun?: string;
  kondisi?: MachineKondisiValue;
  power?: string;
  powerSatuan?: string;
  input?: string;
  output?: string;
};

function EditableFieldUnit({
  label,
  value,
  onValueChange,
  unit,
  onUnitChange,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  unit: string;
  onUnitChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">{label}</div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec] disabled:text-[#8a7565]"
        />
        <input
          type="text"
          value={unit}
          disabled={disabled}
          onChange={(e) => onUnitChange(e.target.value)}
          placeholder="satuan"
          className="w-20 shrink-0 rounded-lg border border-[#e8dccd] bg-white px-2 py-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec] disabled:text-[#8a7565]"
        />
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">{label}</div>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec] disabled:text-[#8a7565]"
      />
    </div>
  );
}

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

type Props = { assignmentId: string; assignmentStatus: AssignmentStatusValue };

export function MachineVerificationTab({ assignmentId, assignmentStatus }: Props) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftJumlahTerpasang, setDraftJumlahTerpasang] = useState<Record<string, string>>({});
  const [draftJumlahTidakAktif, setDraftJumlahTidakAktif] = useState<Record<string, string>>({});
  const [draftKeteranganJumlah, setDraftKeteranganJumlah] = useState<Record<string, string>>({});
  const [draftMachineData, setDraftMachineData] = useState<Record<string, MachineDataDraft>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Local drag-time order — reset to natural (server) order whenever it stops matching the
  // current row set (fresh load, add/delete, or a refetch after persisting), so this never
  // needs an effect to stay in sync.
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const canEdit = assignmentStatus === "SUBMITTED";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "machines"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`);
      if (!response.ok) throw new Error("Gagal memuat daftar mesin");
      const json = (await response.json()) as { data: MachineRow[] };
      return json.data;
    },
  });

  const rows = data ?? [];
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const reportQueryKey = ["/api/verifikator-workspace", "assignments", assignmentId, "document-report"];
  /** The report page has its own separate query cache — any machine mutation here (status,
   * photos, data corrections, add/delete, reorder) must invalidate it too, or a report tab
   * already open in this session keeps showing stale data until a hard refresh. */
  function invalidateAll() {
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: reportQueryKey });
  }
  const currentOrderIds =
    orderIds.length === rows.length && orderIds.every((rid) => rowById.has(rid)) ? orderIds : rows.map((r) => r.id);
  const orderedRows = currentOrderIds.map((rid) => rowById.get(rid)!);

  async function handleDecision(row: MachineRow, status: MachineVerificationStatusValue) {
    setSavingId(row.id);
    const note = draftNotes[row.id] ?? row.note;
    const jumlahTerpasang = draftJumlahTerpasang[row.id] ?? row.jumlahTerpasang;
    const jumlahTidakAktif = draftJumlahTidakAktif[row.id] ?? row.jumlahTidakAktif;
    const keteranganJumlah = draftKeteranganJumlah[row.id] ?? row.keteranganJumlah;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status, note, jumlahTerpasang, jumlahTidakAktif, keteranganJumlah }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status mesin");
      return;
    }
    toast.success(`${row.proses} ditandai ${MACHINE_VERIFICATION_STATUS_LABELS[status]}.`);
    invalidateAll();
  }

  async function patchPhotos(row: MachineRow, patch: { photoPath?: string; photoPaths?: string[] }) {
    setSavingId(row.id);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, ...patch }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan foto mesin");
      return false;
    }
    invalidateAll();
    return true;
  }

  /** New photo joins the gallery and immediately becomes the cover/thumbnail — most intuitive default after an upload. */
  async function handleAddPhoto(row: MachineRow, path: string) {
    const ok = await patchPhotos(row, { photoPaths: [...row.photoMesinPaths, path], photoPath: path });
    if (ok) toast.success(`Foto ditambahkan untuk ${row.proses}.`);
  }

  async function handleSetCoverPhoto(row: MachineRow, path: string) {
    if (path === row.photoMesinPath) return;
    const ok = await patchPhotos(row, { photoPath: path });
    if (ok) toast.success(`Foto sampul ${row.proses} diperbarui.`);
  }

  /** Only verifikator-added photos can be removed — the applicant's original stays in the gallery as a permanent record. */
  async function handleRemovePhoto(row: MachineRow, path: string) {
    const nextPaths = row.photoMesinPaths.filter((p) => p !== path);
    const wasCover = row.photoMesinPath === path;
    const ok = await patchPhotos(row, {
      photoPaths: nextPaths,
      // Falling back to "" makes the server re-derive the cover as the applicant's original photo.
      ...(wasCover ? { photoPath: nextPaths[0] ?? "" } : {}),
    });
    if (ok) toast.success(`Foto dihapus dari ${row.proses}.`);
  }

  function updateDraftMachineData(rowId: string, patch: MachineDataDraft) {
    setDraftMachineData((prev) => ({ ...prev, [rowId]: { ...prev[rowId], ...patch } }));
  }

  /** Saves both SPESIFIKASI PROSES (payload.machines) and HASIL VERIFIKASI JUMLAH MESIN
   * (jumlahTerpasang/jumlahTidakAktif/keteranganJumlah — verifikator's own findings, stored
   * separately on machineVerifications) in one PATCH, since the button sits below both sections
   * now and either one alone (or both) can be dirty when it's clicked. */
  async function handleSaveMachineData(row: MachineRow) {
    const draft = draftMachineData[row.id];
    const hasJumlahDraft =
      row.id in draftJumlahTerpasang || row.id in draftJumlahTidakAktif || row.id in draftKeteranganJumlah;
    if (!draft && !hasJumlahDraft) return;
    setSavingId(row.id);
    // Kapasitas Produksi is derived, never hand-typed — always recompute from the
    // effective (draft-or-saved) jumlah × kapasitas per jam at save time.
    const jumlah = parseNum(draft?.jumlah ?? row.quantity);
    const kapasitasJam = parseNum(draft?.kapasitasJam ?? row.kapasitasJam);
    const computedKapasitas = jumlah !== null && kapasitasJam !== null ? jumlah * kapasitasJam : null;
    const machineData: MachineDataDraft = {
      ...draft,
      ...(computedKapasitas !== null
        ? { kapasitas: fmtNum(computedKapasitas), kapasitasSatuan: draft?.kapasitasJamSatuan ?? row.kapasitasJamSatuan }
        : {}),
    };
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        ...(draft ? { machineData } : {}),
        jumlahTerpasang: draftJumlahTerpasang[row.id] ?? row.jumlahTerpasang,
        jumlahTidakAktif: draftJumlahTidakAktif[row.id] ?? row.jumlahTidakAktif,
        keteranganJumlah: draftKeteranganJumlah[row.id] ?? row.keteranganJumlah,
      }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan data mesin");
      return;
    }
    toast.success(`Data mesin ${row.proses} diperbarui — tersinkron ke data aplikasi.`);
    setDraftMachineData((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setDraftJumlahTerpasang((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setDraftJumlahTidakAktif((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setDraftKeteranganJumlah((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    invalidateAll();
  }

  async function handleAddMachine() {
    setIsAdding(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setIsAdding(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menambahkan mesin");
      return;
    }
    const { data: newMachine } = (await response.json()) as { data: { id: string } };
    toast.success("Mesin baru ditambahkan — lengkapi datanya di bawah.");
    setExpandedId(newMachine.id);
    invalidateAll();
  }

  async function handleDeleteMachine(row: MachineRow) {
    if (!window.confirm(`Hapus mesin "${row.proses || row.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(row.id);
    const response = await fetch(
      `/api/verifikator-workspace/assignments/${assignmentId}/machines?machineId=${encodeURIComponent(row.id)}`,
      { method: "DELETE" },
    );
    setDeletingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menghapus mesin");
      return;
    }
    toast.success(`Mesin "${row.proses || row.nama}" dihapus.`);
    setExpandedId((prev) => (prev === row.id ? null : prev));
    invalidateAll();
  }

  function handleDragStart(id: string) {
    setDragId(id);
  }

  /** Reorders the local (unsaved) list live as the dragged row passes over another — the actual
   * PUT only fires once on drop, in handleDragEnd. */
  function handleDragOver(event: React.DragEvent, overId: string) {
    event.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = currentOrderIds.indexOf(dragId);
    const to = currentOrderIds.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...currentOrderIds];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setOrderIds(next);
  }

  async function handleDragEnd() {
    const draggedId = dragId;
    setDragId(null);
    if (!draggedId) return;
    // Nothing moved — server order already matches, skip the request.
    if (currentOrderIds.every((rid, i) => rid === rows[i]?.id)) return;

    setIsSavingOrder(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: currentOrderIds }),
    });
    setIsSavingOrder(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan urutan mesin");
      setOrderIds([]);
      return;
    }
    toast.success("Urutan mesin diperbarui.");
    invalidateAll();
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat daftar mesin...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#8a7565]">
          Data mesin produksi sesuai lampiran aplikasi.
          {canEdit && " Geser ikon di kiri baris untuk mengubah urutan."}
          {isSavingOrder && " Menyimpan urutan..."}
        </p>
        {canEdit && (
          <button
            type="button"
            disabled={isAdding}
            onClick={handleAddMachine}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
          >
            <MaterialIcon name="add" className="text-[15px]" />
            {isAdding ? "Menambahkan..." : "Tambah Mesin"}
          </button>
        )}
      </div>

      {rows.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada data mesin pada aplikasi ini.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-[9px] border border-[#e8dccd]">
          <div className="grid min-w-7xl grid-cols-[0.3fr_0.35fr_0.9fr_0.9fr_0.6fr_0.6fr_0.5fr_1fr_1fr_1fr_1.2fr_0.9fr] bg-[#e0662e]">
            {[
              "",
              "No",
              "Proses",
              "Jenis Mesin",
              "Merk",
              "Model",
              "Tahun",
              "Jumlah Mesin pada Permohonan",
              "Jumlah Mesin Terpasang",
              "Jumlah Mesin Tidak Aktif",
              "Keterangan",
              "Kapasitas/Tahun",
            ].map((h) => (
              <div key={h} className="border-r border-white/30 px-3 py-2.5 text-[12px] font-extrabold text-white last:border-r-0">
                {h}
              </div>
            ))}
          </div>
          {orderedRows.map((row, index) => {
            const isExpanded = expandedId === row.id;
            const isDragging = dragId === row.id;
            return (
              <div key={row.id}>
                <div
                  role="button"
                  tabIndex={0}
                  draggable={canEdit && !isSavingOrder}
                  onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId((prev) => (prev === row.id ? null : row.id));
                    }
                  }}
                  onDragStart={() => handleDragStart(row.id)}
                  onDragOver={(event) => handleDragOver(event, row.id)}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={handleDragEnd}
                  className={`grid min-w-7xl cursor-pointer grid-cols-[0.3fr_0.35fr_0.9fr_0.9fr_0.6fr_0.6fr_0.5fr_1fr_1fr_1fr_1.2fr_0.9fr] border-t border-[#f0ded0] ${isDragging ? "opacity-40" : ""}`}
                >
                  <div
                    className="flex items-center justify-center border-r border-[#f0ded0] text-[#c8bba9]"
                    style={{ cursor: canEdit ? "grab" : "default" }}
                    title={canEdit ? "Geser untuk mengubah urutan" : undefined}
                  >
                    {canEdit && <MaterialIcon name="drag_indicator" className="text-[16px]" />}
                  </div>
                  <div className="flex items-center gap-1.5 border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[16px] text-[#a68f80]" />
                    {index + 1}
                  </div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] font-semibold text-[#20180f]">{row.proses || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.nama || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.merk || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.model || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.tahun || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">
                    {row.quantity ? `${row.quantity} ${row.quantitySatuan}`.trim() : "—"}
                  </div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.jumlahTerpasang || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.jumlahTidakAktif || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.keteranganJumlah || "—"}</div>
                  <div className="flex items-center justify-between gap-1.5 px-3 py-2.5">
                    <span className="text-[12.5px] text-[#4a4038]">
                      {row.kapasitasPerTahun ? `${fmtNum(Number(row.kapasitasPerTahun))} ${row.kapasitasJamSatuan}`.trim() : "—"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${MACHINE_VERIFICATION_STATUS_BADGE[row.status]}`}>
                      {MACHINE_VERIFICATION_STATUS_LABELS[row.status]}
                    </span>
                  </div>
                </div>
                {isExpanded && (() => {
                  const draft = draftMachineData[row.id];
                  const value = (key: keyof MachineDataDraft, fallback: string): string => (draft?.[key] as string | undefined) ?? fallback;
                  const set = (patch: MachineDataDraft) => updateDraftMachineData(row.id, patch);
                  const hasDraft =
                    Boolean(draft && Object.keys(draft).length > 0) ||
                    row.id in draftJumlahTerpasang ||
                    row.id in draftJumlahTidakAktif ||
                    row.id in draftKeteranganJumlah;
                  // Kapasitas Produksi = jumlah mesin × kapasitas/jam — never hand-typed.
                  const liveJumlah = parseNum(value("jumlah", row.quantity));
                  const liveKapasitasJam = parseNum(value("kapasitasJam", row.kapasitasJam));
                  const liveKapasitas = liveJumlah !== null && liveKapasitasJam !== null ? liveJumlah * liveKapasitasJam : null;
                  return (
                  <div className="border-t border-[#f0ded0] bg-[#fbf8f4] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-wide text-[#8a7565]">SPESIFIKASI PROSES</div>
                      <span className="flex items-center gap-1 rounded-full bg-[#e6effa] px-2.5 py-0.75 text-[10.5px] font-bold text-[#2f6fe0]">
                        <MaterialIcon name="edit" className="text-[13px]" />
                        Dapat dikoreksi verifikator — tersinkron ke data aplikasi
                      </span>
                    </div>
                    <div className="mb-3.5 flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <EditableField label="Nama Proses" value={value("proses", row.proses)} onChange={(v) => set({ proses: v })} disabled={!canEdit} />
                        <EditableField label="Jenis Mesin" value={value("nama", row.nama)} onChange={(v) => set({ nama: v })} disabled={!canEdit} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <EditableField label="Merk" value={value("merk", row.merk)} onChange={(v) => set({ merk: v })} disabled={!canEdit} />
                        <EditableField label="Model" value={value("model", row.model)} onChange={(v) => set({ model: v })} disabled={!canEdit} />
                        <EditableField label="Tahun" value={value("tahun", row.tahun)} onChange={(v) => set({ tahun: v })} disabled={!canEdit} />
                      </div>
                      <EditableFieldUnit
                        label="Jumlah Mesin pada Permohonan"
                        value={value("jumlah", row.quantity)}
                        onValueChange={(v) => set({ jumlah: v })}
                        unit={value("jumlahSatuan", row.quantitySatuan)}
                        onUnitChange={(v) => set({ jumlahSatuan: v })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="mb-3.5">
                      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Foto Mesin</div>
                      <MachinePhotoGallery
                        row={row}
                        canEdit={canEdit}
                        onAddPhoto={(path) => handleAddPhoto(row, path)}
                        onSetCover={(path) => handleSetCoverPhoto(row, path)}
                        onRemovePhoto={(path) => handleRemovePhoto(row, path)}
                      />
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field
                        label="Kapasitas Produksi (jumlah × kapasitas/jam)"
                        value={liveKapasitas !== null ? `${fmtNum(liveKapasitas)} ${value("kapasitasJamSatuan", row.kapasitasJamSatuan)}`.trim() : ""}
                      />
                      <EditableFieldUnit
                        label="Kapasitas Produksi per Jam"
                        value={value("kapasitasJam", row.kapasitasJam)}
                        onValueChange={(v) => set({ kapasitasJam: v })}
                        unit={value("kapasitasJamSatuan", row.kapasitasJamSatuan)}
                        onUnitChange={(v) => set({ kapasitasJamSatuan: v })}
                        disabled={!canEdit}
                      />
                      <EditableFieldUnit
                        label="Power Consumption"
                        value={value("power", row.power)}
                        onValueChange={(v) => set({ power: v })}
                        unit={value("powerSatuan", row.powerSatuan)}
                        onUnitChange={(v) => set({ powerSatuan: v })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditableField
                        label="Waktu Beroperasi (jam/hari)"
                        value={value("waktuBeroperasi", row.waktuBeroperasi)}
                        onChange={(v) => set({ waktuBeroperasi: v })}
                        disabled={!canEdit}
                      />
                      <Field
                        label="Kapasitas per Hari (waktu beroperasi × kapasitas produksi)"
                        value={[row.kapasitasPerHari, row.kapasitasJamSatuan].filter(Boolean).join(" ")}
                      />
                      <div>
                        <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Kondisi</div>
                        <select
                          value={value("kondisi", row.kondisi)}
                          disabled={!canEdit}
                          onChange={(e) => set({ kondisi: e.target.value as MachineKondisiValue })}
                          className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec] disabled:text-[#8a7565]"
                        >
                          <option value="">—</option>
                          {MACHINE_KONDISI_VALUES.map((k) => (
                            <option key={k} value={k}>
                              {MACHINE_KONDISI_LABELS[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditableField
                        label="Jumlah Hari Efektif per Tahun (hari)"
                        value={value("hariEfektifPerTahun", row.hariEfektifPerTahun)}
                        onChange={(v) => set({ hariEfektifPerTahun: v })}
                        disabled={!canEdit}
                      />
                      <Field
                        label="Kapasitas per Tahun (hari efektif × kapasitas per hari)"
                        value={[row.kapasitasPerTahun, row.kapasitasJamSatuan].filter(Boolean).join(" ")}
                      />
                    </div>
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditableField label="Input / Raw Material" value={value("input", row.input)} onChange={(v) => set({ input: v })} disabled={!canEdit} />
                      <EditableField label="Output / Produk" value={value("output", row.output)} onChange={(v) => set({ output: v })} disabled={!canEdit} />
                    </div>
                    <div className="mb-3.5 border-t border-[#e8dccd] pt-3.5">
                      <div className="mb-3 text-[11px] font-bold tracking-wide text-[#8a7565]">HASIL VERIFIKASI JUMLAH MESIN</div>
                      <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <EditableField
                          label="Jumlah Mesin Terpasang"
                          value={draftJumlahTerpasang[row.id] ?? row.jumlahTerpasang}
                          onChange={(v) => setDraftJumlahTerpasang((prev) => ({ ...prev, [row.id]: v }))}
                          disabled={!canEdit}
                        />
                        <EditableField
                          label="Jumlah Mesin Tidak Aktif"
                          value={draftJumlahTidakAktif[row.id] ?? row.jumlahTidakAktif}
                          onChange={(v) => setDraftJumlahTidakAktif((prev) => ({ ...prev, [row.id]: v }))}
                          disabled={!canEdit}
                        />
                        <EditableField
                          label="Keterangan"
                          value={draftKeteranganJumlah[row.id] ?? row.keteranganJumlah}
                          onChange={(v) => setDraftKeteranganJumlah((prev) => ({ ...prev, [row.id]: v }))}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    {canEdit && (
                      <div className="mb-4 flex justify-between gap-2">
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDeleteMachine(row)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#dc2626] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#dc2626] disabled:opacity-50"
                        >
                          <MaterialIcon name="delete" className="text-[15px]" />
                          {deletingId === row.id ? "Menghapus..." : "Hapus Mesin"}
                        </button>
                        <button
                          type="button"
                          disabled={!hasDraft || savingId === row.id}
                          onClick={() => handleSaveMachineData(row)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                        >
                          <MaterialIcon name="sync" className="text-[15px]" />
                          Simpan Data Mesin ke Aplikasi
                        </button>
                      </div>
                    )}

                    <div className="border-t border-[#e8dccd] pt-3.5">
                      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Uraian Observasi</div>
                      <RichTextEditor
                        value={draftNotes[row.id] ?? row.note}
                        placeholder="Tuliskan hasil observasi verifikator terhadap mesin ini..."
                        disabled={!canEdit}
                        onChange={(html) => setDraftNotes((prev) => ({ ...prev, [row.id]: html }))}
                      />
                      {canEdit && (
                        <div className="mt-3.5 flex justify-end gap-2.5">
                          <button
                            type="button"
                            disabled={savingId === row.id}
                            onClick={() => handleDecision(row, "PENDING")}
                            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
                          >
                            <MaterialIcon name="save" className="text-[15px]" />
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={savingId === row.id}
                            onClick={() => handleDecision(row, "REJECTED")}
                            className="flex items-center gap-1.5 rounded-lg border border-[#dc2626] bg-white px-3.5 py-2 text-[12px] font-bold text-[#dc2626] disabled:opacity-50"
                          >
                            <MaterialIcon name="cancel" className="text-[15px]" />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={savingId === row.id}
                            onClick={() => handleDecision(row, "APPROVED")}
                            className="flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                          >
                            <MaterialIcon name="check_circle" className="text-[15px]" />
                            Approve
                          </button>
                        </div>
                      )}
                      {row.verifiedAt && (
                        <div className="mt-2 text-[10.5px] text-[#8a7565]">
                          Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
