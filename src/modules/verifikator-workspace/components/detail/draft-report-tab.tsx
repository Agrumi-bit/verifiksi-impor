"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePad } from "@/components/form/signature-pad";

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

type DocumentRow = {
  key: string;
  label: string;
  category: string;
  hasDocument: boolean;
  status: "PENDING" | "VALID" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE";
  note: string | null;
  verifiedAt: string | null;
};

type ReportData = {
  assignmentNumber: string;
  applicationNumber: string;
  verificationType: string;
  status: string;
  validationNotes: string | null;
  validatedAt: string | null;
  companyName: string;
  verifikatorName: string | null;
  technicalReviewerName: string | null;
  documents: DocumentRow[];
};

const STATUS_LABELS: Record<DocumentRow["status"], string> = {
  PENDING: "Belum Diperiksa",
  VALID: "Verified",
  NEED_REVISION: "Need Revision",
  REJECTED: "Reject",
  NOT_APPLICABLE: "N/A",
};

type Props = { assignmentId: string; initialNotes: string | null };

export function DraftReportTab({ assignmentId, initialNotes }: Props) {
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

  async function generateReport() {
    setIsGenerating(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/document-report`);
    setIsGenerating(false);
    if (!response.ok) {
      toast.error("Gagal membuat laporan");
      return;
    }
    const body = (await response.json()) as { data: ReportData };
    setReport(body.data);
    toast.success("Laporan berhasil dibuat.");
  }

  async function saveDraft() {
    setIsSavingDraft(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationNotes: kesimpulan }),
    });
    setIsSavingDraft(false);
    if (!response.ok) {
      toast.error("Gagal menyimpan draft");
      return;
    }
    toast.success("Draft tersimpan.");
  }

  function openConfirm() {
    setDialogStep("confirm");
    setSignatureDateInput(todayInputValue());
    setSignatureDataUrl(null);
    setShowConfirm(true);
  }

  async function submitReport() {
    if (!kesimpulan.trim()) {
      toast.error("Kesimpulan Verifikator wajib diisi.");
      return;
    }
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
    const uploadBody = (await uploadResponse.json()) as { path: string };

    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: "COMPLETED",
        notes: kesimpulan,
        signaturePath: uploadBody.path,
        signatureDate: signatureDateInput,
      }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal mengirim laporan");
      return;
    }
    toast.success("Laporan verifikasi berhasil dikirim.");
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace"] });
    setShowConfirm(false);
    router.push("/verifikator-workspace/approval-center");
  }

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-1.5 text-[13.5px] font-bold text-[#20180f]">
        Kesimpulan Verifikator <span className="text-[#e0662e]">*</span>
      </div>
      <textarea
        value={kesimpulan}
        onChange={(event) => setKesimpulan(event.target.value)}
        placeholder="Tuliskan kesimpulan hasil verifikasi (sesuai / tidak sesuai, catatan penting, rekomendasi)..."
        className="w-full rounded-[10px] border border-[#e8d5c5] p-3.5 text-[13.5px] text-[#20180f] outline-none"
        rows={7}
      />

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={saveDraft}
          disabled={isSavingDraft}
          className="border-[#e1bfb3] text-[#261813]"
        >
          <MaterialIcon name="save" className="text-[16px]" />
          {isSavingDraft ? "Menyimpan..." : "Save Draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={generateReport}
          disabled={isGenerating}
          className="border-[#e1bfb3] text-[#261813]"
        >
          <MaterialIcon name="description" className="text-[16px]" />
          {isGenerating ? "Membuat..." : "Generate Report"}
        </Button>
        <Button type="button" onClick={openConfirm} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
          <MaterialIcon name="send" className="text-[16px]" />
          Submit Report
        </Button>
      </div>

      {report && (
        <div className="mt-5 rounded-[10px] border border-[#e1bfb3] bg-[#faf7f4] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <MaterialIcon name="description" className="text-[20px] text-[#e0662e]" />
              <div>
                <div className="text-[14px] font-extrabold text-[#20180f]">Laporan Verifikasi Dokumen</div>
                <div className="text-[11.5px] text-[#8a7565]">
                  {report.companyName} &middot; {report.assignmentNumber}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/verifikator-workspace/assignments/${assignmentId}/document-report`} target="_blank" />}
              className="border-[#e1bfb3] text-[#261813]"
            >
              <MaterialIcon name="open_in_new" className="text-[16px]" />
              Lihat Laporan Lengkap
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {[
              { label: "Total Dokumen", value: report.documents.length },
              { label: "Verified", value: report.documents.filter((d) => d.status === "VALID").length },
              { label: "Need Revision", value: report.documents.filter((d) => d.status === "NEED_REVISION").length },
              { label: "Reject", value: report.documents.filter((d) => d.status === "REJECTED").length },
              {
                label: "N/A & Belum Diperiksa",
                value: report.documents.filter((d) => d.status === "NOT_APPLICABLE" || d.status === "PENDING").length,
              },
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
                  <th className="px-3 py-2 font-bold">Dokumen</th>
                  <th className="px-3 py-2 font-bold">Kategori</th>
                  <th className="px-3 py-2 font-bold">Status Review</th>
                </tr>
              </thead>
              <tbody>
                {report.documents.map((doc) => (
                  <tr key={doc.key} className="border-t border-[#f5ebe1]">
                    <td className="px-3 py-2 font-semibold text-[#20180f]">{doc.label}</td>
                    <td className="px-3 py-2 text-[#8a7565]">{doc.category}</td>
                    <td className="px-3 py-2">{STATUS_LABELS[doc.status]}</td>
                  </tr>
                ))}
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
                Assignment akan ditandai Completed dengan kesimpulan di atas sebagai catatan keputusan. Tindakan ini sama dengan menekan
                Approve pada panel keputusan.
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
                <Button
                  onClick={() => setDialogStep("sign")}
                  disabled={!signatureDateInput}
                  className="bg-[#e0662e] text-white hover:bg-[#c1361f]"
                >
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
