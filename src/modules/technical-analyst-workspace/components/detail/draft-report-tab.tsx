"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/form/signature-pad";
import { TECHNICAL_MODULE_LABELS, technicalModuleKeysFor, type TechnicalModuleKey } from "../../status";
import { DOCUMENT_REPORT_REVIEW_DECISION_LABELS, type DocumentReportReview } from "../../document-report-review";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type ReportData = {
  assignmentNumber: string;
  verificationType: string;
  importTypes: string[];
  companyName: string;
  technicalReviewerName: string | null;
  technicalAnalysisData: Record<string, { status?: string }>;
  documentReportReview: DocumentReportReview;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SESUAI: { label: "Sesuai", className: "bg-[#e2f7ea] text-[#1a9850]" },
  SESUAI_CATATAN: { label: "Sesuai dengan Catatan", className: "bg-[#fdf1dc] text-[#b3650c]" },
  TIDAK_SESUAI: { label: "Tidak Sesuai", className: "bg-[#fbe4de] text-[#c1361f]" },
  PENDING: { label: "Belum Dianalisis", className: "bg-[#f2ece5] text-[#8a7565]" },
};

type Props = {
  assignmentId: string;
  initialNotes: string | null;
  /** Assignment is open for analysis (Submitted / reopened). */
  canEdit: boolean;
  /** Every module decided and the Laporan Verifikasi Dokumen reviewed as Verified. */
  readyForDecision: boolean;
  blockedReason?: string;
};

/**
 * Draft Report for the Technical Analyst — same flow as the Verifikator's Draft Report tab:
 * Kesimpulan, Save Draft, Generate Report (preview + full Laporan Analisis Teknis) and Submit Report
 * with the date and digital signature printed under "Disusun Oleh".
 */
export function TechnicalDraftReportTab({ assignmentId, initialNotes, canEdit, readyForDecision, blockedReason }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [kesimpulan, setKesimpulan] = useState(initialNotes ?? "");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dialogStep, setDialogStep] = useState<"confirm" | "sign">("confirm");
  const [signatureDateInput, setSignatureDateInput] = useState(todayInputValue);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportHref = `/technical-analyst-workspace/assignments/${assignmentId}/technical-report`;

  async function generateReport() {
    setIsGenerating(true);
    const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentId}/technical-report`);
    setIsGenerating(false);
    if (!response.ok) {
      toast.error("Gagal membuat laporan");
      return;
    }
    setReport(((await response.json()) as { data: ReportData }).data);
    toast.success("Laporan berhasil dibuat.");
  }

  async function saveDraft() {
    setIsSavingDraft(true);
    const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationNotes: kesimpulan }),
    });
    setIsSavingDraft(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan draft");
      return;
    }
    toast.success("Draft tersimpan.");
  }

  function openConfirm() {
    if (!kesimpulan.trim()) {
      toast.error("Kesimpulan Analis Teknis wajib diisi.");
      return;
    }
    setDialogStep("confirm");
    setSignatureDateInput(todayInputValue());
    setSignatureDataUrl(null);
    setShowConfirm(true);
  }

  async function submitReport() {
    if (!signatureDataUrl) {
      toast.error("Tanda tangan wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    const signatureForm = new FormData();
    signatureForm.append("file", dataUrlToBlob(signatureDataUrl), `signature-${assignmentId}.png`);
    signatureForm.append("namespace", "signatures");
    const uploadResponse = await fetch("/api/uploads", { method: "POST", body: signatureForm });
    if (!uploadResponse.ok) {
      setIsSubmitting(false);
      toast.error("Gagal mengunggah tanda tangan");
      return;
    }
    const { path } = (await uploadResponse.json()) as { path: string };

    const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "COMPLETED", notes: kesimpulan, signaturePath: path, signatureDate: signatureDateInput }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal mengirim laporan");
      return;
    }
    toast.success("Laporan analisis teknis berhasil dikirim.");
    queryClient.invalidateQueries({ queryKey: ["technical-analyst-workspace"] });
    setShowConfirm(false);
    router.push("/technical-analyst-workspace/my-assignment");
  }

  const moduleKeys: readonly TechnicalModuleKey[] = report ? technicalModuleKeysFor(report.verificationType, report.importTypes) : [];

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-1.5 text-[13.5px] font-bold text-[#20180f]">
        Kesimpulan Analis Teknis <span className="text-[#e0662e]">*</span>
      </div>
      <textarea
        value={kesimpulan}
        onChange={(event) => setKesimpulan(event.target.value)}
        disabled={!canEdit}
        placeholder="Tuliskan kesimpulan hasil analisis teknis (sesuai / tidak sesuai, catatan penting, rekomendasi)..."
        className="w-full rounded-[10px] border border-[#e8d5c5] p-3.5 text-[13.5px] text-[#20180f] outline-none disabled:bg-[#faf7f4]"
        rows={7}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {canEdit && (
          <Button type="button" variant="outline" onClick={saveDraft} disabled={isSavingDraft} className="border-[#e1bfb3] text-[#261813]">
            <MaterialIcon name="save" className="text-[16px]" />
            {isSavingDraft ? "Menyimpan..." : "Save Draft"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={generateReport} disabled={isGenerating} className="border-[#e1bfb3] text-[#261813]">
          <MaterialIcon name="description" className="text-[16px]" />
          {isGenerating ? "Membuat..." : "Generate Report"}
        </Button>
        {canEdit && (
          <Button type="button" onClick={openConfirm} disabled={!readyForDecision} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
            <MaterialIcon name="send" className="text-[16px]" />
            Submit Report
          </Button>
        )}
        {canEdit && !readyForDecision && blockedReason && <span className="text-[12px] text-[#a3690a]">{blockedReason}</span>}
      </div>

      {report && (
        <div className="mt-5 rounded-[10px] border border-[#e1bfb3] bg-[#faf7f4] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <MaterialIcon name="description" className="text-[20px] text-[#e0662e]" />
              <div>
                <div className="text-[14px] font-extrabold text-[#20180f]">Laporan Analisis Teknis</div>
                <div className="text-[11.5px] text-[#8a7565]">
                  {report.companyName} &middot; {report.assignmentNumber}
                </div>
              </div>
            </div>
            <Button variant="outline" nativeButton={false} render={<Link href={reportHref} target="_blank" />} className="border-[#e1bfb3] text-[#261813]">
              <MaterialIcon name="open_in_new" className="text-[16px]" />
              Lihat Laporan Lengkap
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Modul Analisis", value: moduleKeys.length },
              { label: "Sesuai", value: moduleKeys.filter((k) => ["SESUAI", "SESUAI_CATATAN"].includes(report.technicalAnalysisData[k]?.status ?? "")).length },
              { label: "Tidak Sesuai", value: moduleKeys.filter((k) => report.technicalAnalysisData[k]?.status === "TIDAK_SESUAI").length },
              { label: "Belum Dianalisis", value: moduleKeys.filter((k) => !["SESUAI", "SESUAI_CATATAN", "TIDAK_SESUAI"].includes(report.technicalAnalysisData[k]?.status ?? "")).length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#efe2d4] bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-[#8a7565]">{stat.label}</div>
                <div className="mt-0.5 text-[18px] font-extrabold text-[#20180f]">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-[#efe2d4] bg-white">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-[#f2ece5] text-left text-[#4a4038]">
                  <th className="px-3 py-2 font-bold">Modul Analisis</th>
                  <th className="px-3 py-2 font-bold">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {moduleKeys.map((key) => {
                  const s = STATUS_LABEL[report.technicalAnalysisData[key]?.status ?? "PENDING"] ?? STATUS_LABEL.PENDING;
                  return (
                    <tr key={key} className="border-t border-[#f5ebe1]">
                      <td className="px-3 py-2 font-semibold text-[#20180f]">{TECHNICAL_MODULE_LABELS[key]}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${s.className}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[#f5ebe1]">
                  <td className="px-3 py-2 font-semibold text-[#20180f]">Review Laporan Verifikasi Dokumen</td>
                  <td className="px-3 py-2">
                    {report.documentReportReview.decision ? DOCUMENT_REPORT_REVIEW_DECISION_LABELS[report.documentReportReview.decision] : "Belum direview"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className={dialogStep === "sign" ? "sm:max-w-2xl" : undefined}>
          {dialogStep === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>Submit Report</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Assignment akan ditandai Completed dengan kesimpulan di atas sebagai catatan keputusan. Tindakan ini sama dengan menekan Approve
                pada panel keputusan.
              </p>
              <div className="mt-1">
                <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Tanggal (untuk bagian &quot;Disusun Oleh&quot; pada laporan)</div>
                <input
                  type="date"
                  value={signatureDateInput}
                  onChange={(event) => setSignatureDateInput(event.target.value)}
                  className="w-full rounded-lg border border-[#e8d5c5] px-3 py-2 text-[13px] text-[#20180f] outline-none"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button onClick={() => setDialogStep("sign")} disabled={!signatureDateInput} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
                  Lanjut ke Tanda Tangan
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Tanda Tangan Digital</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tanda tangan ini akan tercetak pada bagian &quot;Disusun Oleh&quot; di laporan, bersama tanggal {signatureDateInput}.
              </p>
              <SignaturePad onChange={setSignatureDataUrl} disabled={isSubmitting} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogStep("confirm")} disabled={isSubmitting}>
                  Kembali
                </Button>
                <Button onClick={submitReport} disabled={isSubmitting || !signatureDataUrl} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
                  {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
