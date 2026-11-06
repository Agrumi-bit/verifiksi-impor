"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

import { TINDAK_LANJUT, TINDAK_LANJUT_LABELS, vkiCheckConclusion, type CrDataCheckInput, type VkiCheck } from "../../vki-check";

const INPUT = "w-full rounded-lg border border-[#e8d5c5] bg-white px-2.5 py-1.5 text-[12.5px] text-[#20180f] outline-none focus:border-[#e0662e]";

/**
 * CR's input for the VKI "Form Pemeriksaan Kelengkapan Data dan Dokumen": Sesuai/Tidak sesuai and a
 * catatan per data item (Pasal 30 ayat (2) huruf a), the Pasal 25 basis, API-U mitra/kontrak, batas
 * waktu perbaikan and tindak lanjut. Ada/Tidak ada is read from the application itself.
 */
export function VkiDataCheckCard({ applicationId, check, onSaved }: { applicationId: string; check: VkiCheck; onSaved: () => void }) {
  const initial = (): CrDataCheckInput => ({
    items: Object.fromEntries(check.dataRows.map((r) => [r.key, { sesuai: r.sesuai, note: r.note }])),
    dasarKewajiban: check.check.dasarKewajiban,
    apiuMitra: check.check.apiuMitra,
    kontrak: check.check.kontrak,
    batasWaktu: check.check.batasWaktu,
    tindakLanjut: check.check.tindakLanjut,
  });
  const [form, setForm] = useState<CrDataCheckInput>(initial);
  const [saving, setSaving] = useState(false);
  const conclusion = vkiCheckConclusion(check);

  const setItem = (key: string, patch: Partial<CrDataCheckInput["items"][string]>) =>
    setForm((f) => ({ ...f, items: { ...f.items, [key]: { sesuai: f.items[key]?.sesuai ?? null, note: f.items[key]?.note ?? "", ...patch } } }));

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/data-check`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Gagal menyimpan pemeriksaan data");
      return;
    }
    toast.success("Pemeriksaan data tersimpan.");
    onSaved();
  }

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[15.5px] font-extrabold text-[#20180f]">
            <ClipboardCheck className="size-4.5 text-[#e0662e]" />
            Pemeriksaan Kelengkapan Data VKI
          </div>
          <div className="mt-0.5 text-[13px] text-[#8a7565]">
            Pasal 30 ayat (2) huruf a — Ada/Tidak ada dibaca dari permohonan; tandai kewajarannya terhadap dokumen pendukung.
            {check.check.updatedAt && ` Terakhir disimpan ${new Date(check.check.updatedAt).toLocaleString("id-ID")}${check.check.updatedByName ? ` oleh ${check.check.updatedByName}` : ""}.`}
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#e0662e] px-4 py-1.75 text-[12px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Pemeriksaan"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[#efe2d4] text-left text-[11px] uppercase text-[#8a7565]">
              <th className="w-10 py-2">No</th>
              <th className="py-2">Data yang wajib diajukan</th>
              <th className="w-28 py-2">Kelengkapan</th>
              <th className="w-48 py-2">Kesesuaian</th>
              <th className="w-64 py-2">Catatan pemeriksa</th>
            </tr>
          </thead>
          <tbody>
            {check.dataRows.map((r) => {
              const item = form.items[r.key] ?? { sesuai: null, note: "" };
              return (
                <tr key={r.key} className="border-b border-[#f5ece3] align-top">
                  <td className="py-2.5 font-semibold">{r.key}</td>
                  <td className="py-2.5 pr-3">
                    <div className="text-[#20180f]">{r.label}</div>
                    <div className="text-[11px] text-[#a68f80]">{r.ref}</div>
                  </td>
                  <td className="py-2.5">
                    {r.ada ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1a9850]">
                        <CheckCircle2 className="size-3.5" /> Ada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#c1361f]">
                        <XCircle className="size-3.5" /> Tidak ada
                      </span>
                    )}
                    {r.summary && <div className="text-[11px] text-[#8a7565]">{r.summary}</div>}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      {(["SESUAI", "TIDAK_SESUAI"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setItem(r.key, { sesuai: item.sesuai === v ? null : v })}
                          className={`rounded-md border px-2 py-1 text-[11.5px] font-semibold ${
                            item.sesuai === v
                              ? v === "SESUAI"
                                ? "border-[#1a9850] bg-[#e2f7ea] text-[#17683a]"
                                : "border-[#c1361f] bg-[#fbe4de] text-[#a32c16]"
                              : "border-[#e1bfb3] bg-white text-[#5c4a3d]"
                          }`}
                        >
                          {v === "SESUAI" ? "Sesuai" : "Tidak sesuai"}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5">
                    <input className={INPUT} value={item.note} onChange={(e) => setItem(r.key, { note: e.target.value })} placeholder="Catatan..." />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5c4a3d]">
          Dasar kewajiban VKI (Pasal 25)
          <select
            className={INPUT}
            value={form.dasarKewajiban ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dasarKewajiban: (e.target.value || null) as CrDataCheckInput["dasarKewajiban"] }))}
          >
            <option value="">— Pilih —</option>
            <option value="API_P">Perusahaan API-P pengimpor bahan baku/penolong</option>
            <option value="KONTRAK_API_U">Perusahaan Industri berkontrak dengan Perusahaan API-U</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5c4a3d]">
          Perusahaan API-U mitra kontrak (jika ada)
          <input className={INPUT} value={form.apiuMitra} onChange={(e) => setForm((f) => ({ ...f, apiuMitra: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5c4a3d]">
          Nama dan nomor kontrak
          <input className={INPUT} value={form.kontrak} onChange={(e) => setForm((f) => ({ ...f, kontrak: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5c4a3d]">
          Batas waktu perbaikan
          <input type="date" className={INPUT} value={form.batasWaktu} onChange={(e) => setForm((f) => ({ ...f, batasWaktu: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5c4a3d] sm:col-span-2">
          Tindak lanjut
          <select
            className={INPUT}
            value={form.tindakLanjut ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, tindakLanjut: (e.target.value || null) as CrDataCheckInput["tindakLanjut"] }))}
          >
            <option value="">Otomatis — {TINDAK_LANJUT_LABELS[conclusion.suggested]}</option>
            {TINDAK_LANJUT.map((v) => (
              <option key={v} value={v}>
                {TINDAK_LANJUT_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
