"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { formatAssignmentDate } from "@/lib/assignment-date";
import type { PmApplicationDetail } from "../detail/types";
import { encodeLhviuItem, lhviuReportHref, type LhviuDocumentInfo, type LhviuItem, type LhviuOrder } from "./lhviu";
import { PdfViewer } from "@/components/pdf-viewer";

const SUB_TABS = ["verifikasi", "hasil", "lengkap"] as const;
type SubTab = (typeof SUB_TABS)[number];
const SUB_TAB_LABELS: Record<SubTab, string> = {
  verifikasi: "Laporan Verifikasi",
  hasil: "Laporan Hasil VIU",
  lengkap: "Laporan Lengkap",
};

const LOCATION_LABELS: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

type Choice = {
  key: string;
  item: LhviuItem;
  title: string;
  subtitle: string;
  available: boolean;
  unavailableReason?: string;
  approval: string | null;
};

function approvalBadge(status: string | null) {
  if (status === "APPROVED") return <span className="rounded-full bg-[#e2f7ea] px-2 py-0.5 text-[10.5px] font-bold text-[#1a9850]">Disetujui PM</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-[#fbe4de] px-2 py-0.5 text-[10.5px] font-bold text-[#c1361f]">Ditolak PM</span>;
  return <span className="rounded-full bg-[#f2ece5] px-2 py-0.5 text-[10.5px] font-bold text-[#6b5b4c]">Belum disetujui PM</span>;
}

/**
 * LHVIU (VIU only): 1) Laporan Verifikasi — tick the survey / document / technical reports and merge
 * them into one printable report; 2) Laporan Hasil VIU — upload and view the signed PDF; 3) Laporan
 * Lengkap — the merged verification report together with the Laporan Hasil VIU.
 */
export function LhviuTab({ data, applicationNumber, jenis }: { data: PmApplicationDetail; applicationNumber: string; jenis: string }) {
  const [sub, setSub] = useState<SubTab>("verifikasi");
  const [order, setOrder] = useState<LhviuOrder>("lhviu-first");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const lhviuKey = ["project-manager-workspace", "lhviu", applicationNumber];

  const { data: lhviu } = useQuery({
    queryKey: lhviuKey,
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/lhviu`);
      if (!response.ok) throw new Error("Gagal memuat LHVIU");
      return ((await response.json()) as { data: { document: LhviuDocumentInfo } }).data.document;
    },
  });

  const choices = useMemo<Choice[]>(() => {
    const list: Choice[] = [];
    const survey = data.assignments.survey;
    const surveyAssignments = survey?.assignments ?? [];
    for (const visit of survey?.locationVisits ?? []) {
      const sa = surveyAssignments.find((a) => a.assignmentNumber === visit.assignmentNumber);
      list.push({
        key: `survey:${visit.id}`,
        item: { kind: "survey", assignmentNumber: visit.assignmentNumber, visitId: visit.id },
        title: `Laporan Survey ${LOCATION_LABELS[visit.locationType] ?? visit.locationType}`,
        subtitle: `${visit.assignmentNumber} · ${visit.address}${visit.city ? `, ${visit.city}` : ""}`,
        available: visit.status === "COMPLETED",
        unavailableReason: "Survey lokasi belum selesai",
        approval: sa?.pmReviewStatus ?? survey?.pmReviewStatus ?? null,
      });
    }
    const dokumen = data.assignments.dokumen;
    if (dokumen) {
      list.push({
        key: "dokumen",
        item: { kind: "dokumen", assignmentNumber: dokumen.assignmentNumber },
        title: "Laporan Verifikasi Dokumen",
        subtitle: `${dokumen.assignmentNumber}${dokumen.verifikatorName ? ` · ${dokumen.verifikatorName}` : ""}`,
        available: dokumen.status === "COMPLETED",
        unavailableReason: "Belum disubmit verifikator",
        approval: dokumen.pmReviewStatus,
      });
    }
    const technical = data.assignments.technical;
    if (technical) {
      list.push({
        key: "teknis",
        item: { kind: "teknis", assignmentNumber: technical.assignmentNumber },
        title: "Laporan Teknis",
        subtitle: `${technical.assignmentNumber}${technical.technicalReviewerName ? ` · ${technical.technicalReviewerName}` : ""}`,
        available: true,
        approval: technical.pmReviewStatus,
      });
    }
    return list;
  }, [data]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const isChecked = (c: Choice) => c.available && (selected[c.key] ?? true);
  const selectedItems = choices.filter(isChecked).map((c) => c.item);

  async function upload(file: File) {
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang dapat diunggah.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("namespace", "documents");
      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: form });
      const uploaded = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok) throw new Error(uploaded?.error ?? "Gagal mengunggah file");
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/lhviu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentPath: uploaded.path, fileName: file.name }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Gagal menyimpan Laporan Hasil VIU");
      toast.success("Laporan Hasil VIU diunggah.");
      queryClient.invalidateQueries({ queryKey: lhviuKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const fileHref = lhviu ? `/api/files?path=${encodeURIComponent(lhviu.path)}` : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg bg-[#f7f2ec] p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSub(t)}
            className={`rounded-md px-3.5 py-1.75 text-[12.5px] font-bold ${sub === t ? "bg-white text-[#c14a1f]" : "text-[#8a7565]"}`}
          >
            {SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {(sub === "verifikasi" || sub === "lengkap") && (
        <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
          <div className="mb-1 text-[14px] font-extrabold text-[#20180f]">
            {sub === "verifikasi" ? "Pilih Laporan untuk Laporan Verifikasi" : "Laporan Verifikasi yang Disatukan"}
          </div>
          <div className="mb-3.5 text-[12px] text-[#8a7565]">
            Laporan yang dicentang digabung berurutan menjadi satu laporan. Laporan yang belum tersedia tidak dapat dipilih.
          </div>

          {choices.length === 0 && <p className="text-[13px] text-[#a68f80]">Belum ada laporan untuk permohonan ini.</p>}
          <div className="flex flex-col gap-2">
            {choices.map((c) => (
              <label
                key={c.key}
                className={`flex items-start gap-3 rounded-lg border border-[#f0ded0] p-3 ${c.available ? "cursor-pointer" : "opacity-60"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={!c.available}
                  checked={isChecked(c)}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold text-[#20180f]">{c.title}</span>
                    {c.available ? approvalBadge(c.approval) : <span className="text-[11px] font-semibold text-[#a68f80]">{c.unavailableReason}</span>}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#8a7565]">{c.subtitle}</div>
                </div>
              </label>
            ))}
          </div>

          {sub === "lengkap" && (
            <div className="mt-4 rounded-lg bg-[#f7f2ec] p-3.5">
              <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Laporan Hasil VIU</div>
              {lhviu ? (
                <div className="mb-2.5 text-[12px] text-[#4a4038]">
                  {lhviu.fileName} · diunggah {formatAssignmentDate(lhviu.uploadedAt)}
                </div>
              ) : (
                <div className="mb-2.5 text-[12px] font-semibold text-[#c1361f]">Belum diunggah — unggah di sub tab Laporan Hasil VIU.</div>
              )}
              <div className="flex flex-wrap gap-4 text-[12px] text-[#4a4038]">
                <span className="font-semibold">Urutan:</span>
                {(
                  [
                    ["lhviu-first", "Laporan Hasil VIU, lalu Laporan Verifikasi"],
                    ["verifikasi-first", "Laporan Verifikasi, lalu Laporan Hasil VIU"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1.5">
                    <input type="radio" name="lhviu-order" checked={order === value} onChange={() => setOrder(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={
                selectedItems.length === 0 || (sub === "lengkap" && !lhviu)
                  ? undefined
                  : lhviuReportHref(jenis, applicationNumber, sub === "verifikasi" ? "laporan-verifikasi" : "laporan-lengkap", selectedItems, order)
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={selectedItems.length === 0 || (sub === "lengkap" && !lhviu)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white ${
                selectedItems.length === 0 || (sub === "lengkap" && !lhviu) ? "pointer-events-none bg-[#c9b8aa]" : "bg-[#e0662e] hover:bg-[#c1361f]"
              }`}
            >
              <MaterialIcon name="picture_as_pdf" className="text-[17px]" />
              {sub === "verifikasi" ? `Generate Laporan Verifikasi (${selectedItems.length} laporan)` : "Generate Laporan Lengkap"}
            </a>
          </div>
          <div className="mt-2 text-[11px] text-[#a68f80]">
            Laporan dibuka di tab baru — gunakan tombol Unduh PDF / Cetak untuk menyimpannya sebagai satu file. Urutan:{" "}
            {selectedItems.map(encodeLhviuItem).length > 0 ? choices.filter(isChecked).map((c) => c.title).join(" → ") : "—"}
          </div>
        </div>
      )}

      {sub === "hasil" && (
        <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
          <div className="mb-1 text-[14px] font-extrabold text-[#20180f]">Laporan Hasil Verifikasi Importir Umum (LHVIU)</div>
          <div className="mb-3.5 text-[12px] text-[#8a7565]">Unggah LHVIU yang telah ditandatangani dalam format PDF (maks. 10MB).</div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#c1361f] disabled:opacity-60"
            >
              <MaterialIcon name="upload_file" className="text-[17px]" />
              {uploading ? "Mengunggah..." : lhviu ? "Ganti Dokumen PDF" : "Unggah Dokumen PDF"}
            </button>
            {lhviu && fileHref && (
              <>
                <a
                  href={fileHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-[#261813]"
                >
                  <MaterialIcon name="open_in_new" className="text-[15px]" />
                  Buka PDF
                </a>
                <span className="text-[12px] text-[#4a4038]">
                  {lhviu.fileName} · diunggah {formatAssignmentDate(lhviu.uploadedAt)}
                  {lhviu.uploadedByName ? ` oleh ${lhviu.uploadedByName}` : ""}
                </span>
              </>
            )}
          </div>

          {lhviu ? (
            <div className="rounded-lg bg-[#f1e9df] p-4">
              <PdfViewer url={`/api/files?path=${encodeURIComponent(lhviu.path)}`} title="Laporan Hasil VIU" className="max-h-[75vh] overflow-y-auto" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#e1bfb3] p-8 text-center text-[13px] text-[#a68f80]">
              Belum ada Laporan Hasil VIU yang diunggah.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
