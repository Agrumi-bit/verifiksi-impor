"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/form/rich-text-editor";
import { MaterialIcon } from "../material-icon";
import { PRODUCTION_QTY_MESIN_SUMMARY_KEY } from "../../status";

type MesinConclusion = { status: string; keterangan: string; kesimpulan: string };

/**
 * Uraian Observasi for the whole Machine Verification tab — printed in the report as the
 * "Catatan Verifikator" of "2. Kemampuan Produksi Setiap Mesin per Hari". Stored with the other
 * section conclusions (productionQtyVerifications, key `summary:mesin`); empty means the report
 * keeps its generated narrative.
 */
export function MachineObservationEditor({ assignmentId, canEdit, onSaved }: { assignmentId: string; canEdit: boolean; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "production-quantity"];
  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`);
      if (!response.ok) throw new Error("Gagal memuat data");
      return (await response.json()).data as { mesinConclusion?: MesinConclusion };
    },
  });
  const saved = data?.mesinConclusion ?? { status: "PENDING", keterangan: "", kesimpulan: "" };
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const value = draft ?? saved.keterangan;

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: PRODUCTION_QTY_MESIN_SUMMARY_KEY, status: saved.status || "PENDING", keterangan: value }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan uraian observasi");
      return;
    }
    toast.success("Uraian observasi mesin disimpan.");
    setDraft(null);
    queryClient.invalidateQueries({ queryKey });
    onSaved();
  }

  return (
    <div className="mt-4 rounded-xl border border-[#e8dccd] bg-white p-4">
      <div className="text-[13px] font-bold text-[#20180f]">Uraian Observasi — Kemampuan Produksi Mesin</div>
      <p className="mb-2.5 mt-0.5 text-[11.5px] text-[#8a7565]">
        Tampil di laporan sebagai &quot;Catatan Verifikator&quot; pada bagian 2. Kemampuan Produksi Setiap Mesin per Hari. Jika kosong, laporan memakai uraian otomatis dari data mesin.
      </p>
      <RichTextEditor
        value={value}
        placeholder="Tuliskan uraian observasi verifikator terhadap keseluruhan mesin produksi (susunan alur proses, kondisi, kemampuan produksi)..."
        disabled={!canEdit}
        onChange={(html) => setDraft(html)}
      />
      {canEdit && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={saving || draft === null || draft === saved.keterangan}
            onClick={save}
            className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <MaterialIcon name="save" className="text-[15px]" />
            {saving ? "Menyimpan…" : "Simpan Uraian Observasi"}
          </button>
        </div>
      )}
    </div>
  );
}
