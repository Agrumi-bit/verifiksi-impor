"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { MACHINE_VERIFICATION_STATUS_BADGE, MACHINE_VERIFICATION_STATUS_LABELS, type MachineVerificationStatusValue } from "../../status";
import type { AssignmentStatusValue } from "../../status";
import { MACHINE_KONDISI_LABELS, MACHINE_KONDISI_VALUES, type MachineKondisiValue } from "@/modules/applications/schema";
import { FileUploadField } from "@/components/form/file-upload-field";

type MachineRow = {
  id: string;
  nama: string;
  proses: string;
  merk: string;
  model: string;
  tahun: string;
  quantity: string;
  kapasitas: string;
  kapasitasSatuan: string;
  kapasitasJam: string;
  kapasitasJamSatuan: string;
  waktuBeroperasi: string;
  kapasitasPerHari: string;
  kondisi: MachineKondisiValue | "";
  power: string;
  input: string;
  output: string;
  photoMesinPath: string | null;
  originalPhotoMesinPath: string | null;
  status: MachineVerificationStatusValue;
  note: string;
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

type MachineDataDraft = {
  nama?: string;
  proses?: string;
  merk?: string;
  model?: string;
  tahun?: string;
  jumlah?: string;
  kapasitas?: string;
  kapasitasSatuan?: string;
  kapasitasJam?: string;
  kapasitasJamSatuan?: string;
  waktuBeroperasi?: string;
  kondisi?: MachineKondisiValue;
  power?: string;
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
  const [draftMachineData, setDraftMachineData] = useState<Record<string, MachineDataDraft>>({});
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

  async function handleDecision(row: MachineRow, status: MachineVerificationStatusValue) {
    setSavingId(row.id);
    const note = draftNotes[row.id] ?? row.note;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status, note }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status mesin");
      return;
    }
    toast.success(`${row.proses} ditandai ${MACHINE_VERIFICATION_STATUS_LABELS[status]}.`);
    queryClient.invalidateQueries({ queryKey });
  }

  async function handlePhotoChange(row: MachineRow, photoPath: string | undefined) {
    setSavingId(row.id);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, photoPath: photoPath ?? "" }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan foto mesin");
      return;
    }
    toast.success(photoPath ? `Foto ${row.proses} diperbarui.` : `Foto ${row.proses} dikembalikan ke foto asli aplikasi.`);
    queryClient.invalidateQueries({ queryKey });
  }

  function updateDraftMachineData(rowId: string, patch: MachineDataDraft) {
    setDraftMachineData((prev) => ({ ...prev, [rowId]: { ...prev[rowId], ...patch } }));
  }

  async function handleSaveMachineData(row: MachineRow) {
    const draft = draftMachineData[row.id];
    if (!draft) return;
    setSavingId(row.id);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/machines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, machineData: draft }),
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
    queryClient.invalidateQueries({ queryKey });
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat daftar mesin...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#8a7565]">Data mesin produksi sesuai lampiran aplikasi.</p>

      {rows.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada data mesin pada aplikasi ini.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-[9px] border border-[#e8dccd]">
          <div className="grid grid-cols-[0.5fr_1.1fr_1.2fr_0.9fr_0.9fr_0.7fr_0.8fr] bg-[#e0662e]">
            {["No", "Proses", "Jenis Mesin", "Merk", "Model", "Tahun", "Quantity"].map((h) => (
              <div key={h} className="border-r border-white/30 px-3 py-2.5 text-[12px] font-extrabold text-white last:border-r-0">
                {h}
              </div>
            ))}
          </div>
          {rows.map((row, index) => {
            const isExpanded = expandedId === row.id;
            return (
              <div key={row.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId((prev) => (prev === row.id ? null : row.id));
                    }
                  }}
                  className="grid cursor-pointer grid-cols-[0.5fr_1.1fr_1.2fr_0.9fr_0.9fr_0.7fr_0.8fr] border-t border-[#f0ded0]"
                >
                  <div className="flex items-center gap-1.5 border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[16px] text-[#a68f80]" />
                    {index + 1}
                  </div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] font-semibold text-[#20180f]">{row.proses || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.nama || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.merk || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.model || "—"}</div>
                  <div className="border-r border-[#f0ded0] px-3 py-2.5 text-[12.5px] text-[#4a4038]">{row.tahun || "—"}</div>
                  <div className="flex items-center justify-between gap-1.5 px-3 py-2.5">
                    <span className="text-[12.5px] text-[#4a4038]">{row.quantity || "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${MACHINE_VERIFICATION_STATUS_BADGE[row.status]}`}>
                      {MACHINE_VERIFICATION_STATUS_LABELS[row.status]}
                    </span>
                  </div>
                </div>
                {isExpanded && (() => {
                  const draft = draftMachineData[row.id];
                  const value = (key: keyof MachineDataDraft, fallback: string): string => (draft?.[key] as string | undefined) ?? fallback;
                  const set = (patch: MachineDataDraft) => updateDraftMachineData(row.id, patch);
                  const hasDraft = Boolean(draft && Object.keys(draft).length > 0);
                  return (
                  <div className="border-t border-[#f0ded0] bg-[#fbf8f4] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-wide text-[#8a7565]">SPESIFIKASI PROSES</div>
                      <span className="flex items-center gap-1 rounded-full bg-[#e6effa] px-2.5 py-0.75 text-[10.5px] font-bold text-[#2f6fe0]">
                        <MaterialIcon name="edit" className="text-[13px]" />
                        Dapat dikoreksi verifikator — tersinkron ke data aplikasi
                      </span>
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <EditableField label="Nama Proses" value={value("proses", row.proses)} onChange={(v) => set({ proses: v })} disabled={!canEdit} />
                          <EditableField label="Jenis Mesin" value={value("nama", row.nama)} onChange={(v) => set({ nama: v })} disabled={!canEdit} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <EditableField label="Merk" value={value("merk", row.merk)} onChange={(v) => set({ merk: v })} disabled={!canEdit} />
                          <EditableField label="Model" value={value("model", row.model)} onChange={(v) => set({ model: v })} disabled={!canEdit} />
                          <EditableField label="Tahun" value={value("tahun", row.tahun)} onChange={(v) => set({ tahun: v })} disabled={!canEdit} />
                        </div>
                        <EditableField label="Quantity" value={value("jumlah", row.quantity)} onChange={(v) => set({ jumlah: v })} disabled={!canEdit} />
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#20180f]">
                          Foto Mesin
                          {row.photoMesinPath && row.photoMesinPath !== row.originalPhotoMesinPath && (
                            <span className="rounded-full bg-[#e6effa] px-2 py-0.5 text-[9.5px] font-bold text-[#2f6fe0]">Diganti Verifikator</span>
                          )}
                        </div>
                        {row.photoMesinPath ? (
                          <a href={fileHref(row.photoMesinPath)} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileHref(row.photoMesinPath)}
                              alt={row.proses}
                              className="mb-2 aspect-[0.77] w-full rounded-lg border border-[#e8dccd] object-cover"
                            />
                          </a>
                        ) : (
                          <div className="mb-2 flex aspect-[0.77] w-full items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[10px] text-[#5a7a63]">
                            Belum ada foto
                          </div>
                        )}
                        {canEdit && (
                          <FileUploadField
                            namespace="photos"
                            accept=".jpg,.jpeg,.png"
                            label="Ganti Foto"
                            onChange={(path) => handlePhotoChange(row, path)}
                          />
                        )}
                      </div>
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditableFieldUnit
                        label="Kapasitas Produksi"
                        value={value("kapasitas", row.kapasitas)}
                        onValueChange={(v) => set({ kapasitas: v })}
                        unit={value("kapasitasSatuan", row.kapasitasSatuan)}
                        onUnitChange={(v) => set({ kapasitasSatuan: v })}
                        disabled={!canEdit}
                      />
                      <EditableFieldUnit
                        label="Kapasitas Produksi per Jam"
                        value={value("kapasitasJam", row.kapasitasJam)}
                        onValueChange={(v) => set({ kapasitasJam: v })}
                        unit={value("kapasitasJamSatuan", row.kapasitasJamSatuan)}
                        onUnitChange={(v) => set({ kapasitasJamSatuan: v })}
                        disabled={!canEdit}
                      />
                      <EditableField label="Power Consumption" value={value("power", row.power)} onChange={(v) => set({ power: v })} disabled={!canEdit} />
                    </div>
                    <div className="mb-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <EditableField
                        label="Waktu Beroperasi (jam/hari)"
                        value={value("waktuBeroperasi", row.waktuBeroperasi)}
                        onChange={(v) => set({ waktuBeroperasi: v })}
                        disabled={!canEdit}
                      />
                      <Field label="Kapasitas per Hari (dihitung otomatis)" value={[row.kapasitasPerHari, row.kapasitasJamSatuan].filter(Boolean).join(" ")} />
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
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditableField label="Input / Raw Material" value={value("input", row.input)} onChange={(v) => set({ input: v })} disabled={!canEdit} />
                      <EditableField label="Output / Produk" value={value("output", row.output)} onChange={(v) => set({ output: v })} disabled={!canEdit} />
                    </div>
                    {canEdit && (
                      <div className="mb-4 flex justify-end">
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
                      <textarea
                        className="w-full rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec]"
                        rows={3}
                        placeholder="Tuliskan hasil observasi verifikator terhadap mesin ini..."
                        defaultValue={row.note}
                        disabled={!canEdit}
                        onChange={(e) => setDraftNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
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
