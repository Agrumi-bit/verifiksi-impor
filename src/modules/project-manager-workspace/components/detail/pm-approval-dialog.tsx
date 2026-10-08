"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PmApprovalCategory = "laporanSurvey" | "laporanVerifikasi" | "laporanTeknis";

/**
 * PM Approve/Reject confirmation for one report — the same `/approvals/[assignmentId]` call the
 * Approval Center makes, so a decision taken here or there is the same record. Reject needs a note;
 * both need the "sudah direview" confirmation.
 */
export function PmApprovalDialog({
  assignmentId,
  category,
  decision,
  reportLabel,
  approveHint,
  onClose,
  onDone,
}: {
  assignmentId: string;
  category: PmApprovalCategory;
  decision: "APPROVED" | "REJECTED" | null;
  /** e.g. "Laporan Verifikasi Dokumen", "Laporan Survey ASG-SURVEY-…". */
  reportLabel: string;
  approveHint?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  function close() {
    setNote("");
    setConfirmed(false);
    onClose();
  }

  async function submit() {
    if (!decision) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Catatan penolakan wajib diisi.");
      return;
    }
    if (!confirmed) {
      toast.error("Centang konfirmasi terlebih dahulu.");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, decision, note: note.trim() || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan.");
      return;
    }
    toast.success(`${reportLabel} ${decision === "APPROVED" ? "disetujui" : "ditolak"}.`);
    setNote("");
    setConfirmed(false);
    onDone();
  }

  return (
    <Dialog open={decision !== null} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "APPROVED" ? "Setujui" : "Tolak"} {reportLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {decision === "APPROVED" ? (approveHint ?? "Laporan akan berstatus disetujui Project Manager.") : "Laporan akan ditandai ditolak beserta catatan Anda."}
        </p>
        <textarea
          className="w-full rounded-lg border border-input p-3 text-sm outline-none"
          rows={4}
          placeholder={decision === "REJECTED" ? "Catatan penolakan (wajib diisi)..." : "Catatan (opsional)..."}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="flex items-start gap-2 text-[12.5px] text-[#4a4038]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          Saya telah mereview isi {reportLabel}.
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Batal
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className={decision === "APPROVED" ? "bg-[#16a34a] text-white hover:bg-[#13843d]" : "bg-[#c1361f] text-white hover:bg-[#a52c18]"}
          >
            {saving ? "Menyimpan..." : decision === "APPROVED" ? "Setujui" : "Tolak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
