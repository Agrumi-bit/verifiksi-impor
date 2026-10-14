"use client";

import { appendUploadFile } from "@/lib/image-compress";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";
import type { PmApplicationDetail } from "../detail/types";
import { encodeLhviuItem, finalReportLabels, lhviuReportHref, type FinalReportLabels, type LhviuDocumentInfo, type LhviuItem, type LhviuOrder } from "./lhviu";
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
 * LHVIU (VIU) / LHVKI (VKI): 1) Laporan Verifikasi — tick the survey / document / technical reports and
 * merge them into one printable report; 2) Laporan Hasil VIU/VKI — upload and view the signed PDF;
 * 3) Laporan Lengkap — the merged verification report together with the Laporan Hasil.
 */
export function LhviuTab({ data, applicationNumber, jenis }: { data: PmApplicationDetail; applicationNumber: string; jenis: string }) {
  const L = finalReportLabels(data.verificationType);
  const [sub, setSub] = useState<SubTab>("verifikasi");
  const [order, setOrder] = useState<LhviuOrder>("lhviu-first");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const lhviuKey = ["project-manager-workspace", "lhviu", applicationNumber];
  // Recording the LHVIU nomor + tanggal terbit completes the application, so its status/stage refetch too.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: lhviuKey });
    queryClient.invalidateQueries({ queryKey: ["project-manager-workspace", "applications"] });
  };

  const { data: lhviu } = useQuery({
    queryKey: lhviuKey,
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/lhviu`);
      if (!response.ok) throw new Error(`Gagal memuat ${L.abbr}`);
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
      await appendUploadFile(form, file);
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
      if (!response.ok) throw new Error(body?.error ?? `Gagal menyimpan ${L.hasil}`);
      toast.success(body?.data?.completed ? `${L.hasil} diunggah; permohonan selesai (Completed).` : `${L.hasil} diunggah.`);
      refresh();
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
            {t === "hasil" ? L.hasil : SUB_TAB_LABELS[t]}
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
              <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">{L.hasil}</div>
              {lhviu ? (
                <div className="mb-2.5 text-[12px] text-[#4a4038]">
                  {lhviu.fileName} · diunggah {formatAssignmentDate(lhviu.uploadedAt)}
                </div>
              ) : (
                <div className="mb-2.5 text-[12px] font-semibold text-[#c1361f]">Belum diunggah — unggah di sub tab {L.hasil}.</div>
              )}
              <div className="flex flex-wrap gap-4 text-[12px] text-[#4a4038]">
                <span className="font-semibold">Urutan:</span>
                {(
                  [
                    ["lhviu-first", `${L.hasil}, lalu Laporan Verifikasi`],
                    ["verifikasi-first", `Laporan Verifikasi, lalu ${L.hasil}`],
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
          <div className="mb-1 text-[14px] font-extrabold text-[#20180f]">{L.full}</div>
          <div className="mb-3.5 text-[12px] text-[#8a7565]">Unggah {L.abbr} yang telah ditandatangani dalam format PDF (maks. 10MB).</div>

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

          {data.applicationStatus === "COMPLETED" && (
            <CancelCompletion endpoint={`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/completion`} labels={L} onDone={refresh} />
          )}

          {lhviu && (
            <LhviuMetaForm
              key={`${lhviu.path}|${lhviu.number ?? ""}|${lhviu.issuedAt ?? ""}`}
              endpoint={`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/lhviu`}
              initialNumber={lhviu.number ?? ""}
              initialIssuedAt={lhviu.issuedAt ?? ""}
              completed={data.applicationStatus === "COMPLETED"}
              labels={L}
              onSaved={refresh}
            />
          )}

          {lhviu ? (
            <div className="rounded-lg bg-[#f1e9df] p-4">
              <PdfViewer url={`/api/files?path=${encodeURIComponent(lhviu.path)}`} title={L.hasil} className="max-h-[75vh] overflow-y-auto" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#e1bfb3] p-8 text-center text-[13px] text-[#a68f80]">
              Belum ada {L.hasil} yang diunggah.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Nomor and Tanggal Terbit as printed on the signed LHVIU. The Laporan Pelaksanaan VIU (Pasal 47) counts
 * LHVIU per bulan terbit and their 1-year validity (Pasal 39 ayat (6)) from these — not from the upload date.
 */
function LhviuMetaForm({
  endpoint,
  initialNumber,
  initialIssuedAt,
  completed,
  labels: L,
  onSaved,
}: {
  endpoint: string;
  initialNumber: string;
  initialIssuedAt: string;
  /** Application.status is COMPLETED. When it is not (e.g. after "Batalkan Completed"), saving the
   * nomor + tanggal completes the application again. */
  completed: boolean;
  labels: FinalReportLabels;
  onSaved: () => void;
}) {
  const [number, setNumber] = useState(initialNumber);
  const [issuedAt, setIssuedAt] = useState(initialIssuedAt);
  const [saving, setSaving] = useState(false);
  const dirty = number.trim() !== initialNumber || issuedAt !== initialIssuedAt;
  // Saving is allowed whenever both fields are filled, even unchanged (re-save to complete again).
  const filled = Boolean(number.trim()) && Boolean(issuedAt);
  const canComplete = !completed && filled;
  const today = assignmentDateKey(new Date());

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: number.trim() || null, issuedAt: issuedAt || null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? `Gagal menyimpan data ${L.abbr}`);
      toast.success(body?.data?.completed ? `Nomor dan tanggal terbit ${L.abbr} disimpan; permohonan selesai (Completed).` : `Nomor dan tanggal terbit ${L.abbr} disimpan.`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Gagal menyimpan data ${L.abbr}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-[#f0ded0] bg-[#fdf9f5] p-3.5">
      <div className="mb-2.5 text-[12px] text-[#6b5b4c]">
        Isi sesuai yang tercetak pada {L.abbr}. {L.usage}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[11.5px] font-bold text-[#20180f]">
          Nomor {L.abbr}
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={L.placeholder}
            className="mt-1 block w-64 rounded-lg border border-input bg-white px-3 py-2 text-[13px] font-normal outline-none"
          />
        </label>
        <label className="text-[11.5px] font-bold text-[#20180f]">
          Tanggal Terbit
          <input
            type="date"
            value={issuedAt}
            max={today}
            onChange={(e) => setIssuedAt(e.target.value)}
            className="mt-1 block rounded-lg border border-input bg-white px-3 py-2 text-[13px] font-normal outline-none"
          />
        </label>
        <button
          type="button"
          disabled={(!dirty && !filled) || saving}
          onClick={save}
          className="rounded-lg bg-[#2b2420] px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
        >
          {saving ? "Menyimpan..." : canComplete ? "Simpan & Selesaikan" : "Simpan"}
        </button>
      </div>
    </div>
  );
}

/**
 * "Batalkan Completed": recording the LHVIU nomor + tanggal terbit completes the application; when that
 * happened before the other reports were approved, the PM reverts it here (with a reason) and finishes
 * the reviews first. Saving the LHVIU nomor/tanggal or PDF again completes it again.
 */
function CancelCompletion({ endpoint, labels: L, onDone }: { endpoint: string; labels: FinalReportLabels; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Gagal membatalkan status Completed");
      toast.success("Status Completed dibatalkan; laporan lain dapat direview kembali.");
      setOpen(false);
      setReason("");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membatalkan status Completed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-[#cfe9d8] bg-[#eef8f1] p-3.5 text-[12.5px] text-[#20180f]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-[#1a7a4c]">
          <MaterialIcon name="task_alt" className="text-[16px]" />
          Permohonan berstatus Completed karena Nomor dan Tanggal Terbit {L.abbr} sudah dicatat.
        </span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[#c98a1f] bg-white px-3 py-1.5 text-[12px] font-bold text-[#a6791f]"
          >
            Batalkan Completed
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3">
          <div className="mb-1.5 text-[11.5px] text-[#6b5b4c]">
            Status kembali seperti sebelum Completed agar laporan yang belum disetujui dapat direview. Dokumen, nomor, dan tanggal {L.abbr} tetap tersimpan; menyimpan ulang nomor/tanggal {L.abbr} akan menjadikannya Completed lagi.
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Alasan pembatalan (wajib), mis. laporan survei belum disetujui"
            disabled={saving}
            className="w-full resize-none rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={saving || reason.trim().length < 5}
              onClick={submit}
              className="rounded-lg bg-[#c98a1f] px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {saving ? "Membatalkan…" : "Batalkan Completed"}
            </button>
            <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
