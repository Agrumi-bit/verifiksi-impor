"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { AssignmentStatusValue } from "../../status";

type Props = {
  assignmentId: string;
  status: AssignmentStatusValue;
  quickStats: { pendingReview: number };
};

export function DecisionPanel({ assignmentId, status, quickStats }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<"COMPLETED" | "RETURNED" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status !== "SUBMITTED") {
    return (
      <footer className="sticky bottom-0 flex flex-shrink-0 items-center justify-between gap-4 border-t border-[#e4e7f2] bg-white px-7 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="text-sm text-[#3d4258]">
          {status === "COMPLETED" && (
            <span className="flex items-center gap-2 font-semibold text-[#0f7a4d]">
              <MaterialIcon name="task_alt" className="text-base" />
              Assignment ini telah disetujui.
            </span>
          )}
          {status === "RETURNED" && (
            <span className="flex items-center gap-2 font-semibold text-[#c1352b]">
              <MaterialIcon name="undo" className="text-base" />
              Assignment ini telah dikembalikan untuk revisi.
            </span>
          )}
          {status !== "COMPLETED" && status !== "RETURNED" && (
            <span className="text-[#8891ab]">Menunggu survey lapangan selesai sebelum dapat divalidasi.</span>
          )}
        </div>
      </footer>
    );
  }

  async function submitDecision() {
    if (!decision) return;
    if (!notes.trim()) {
      toast.error("Catatan keputusan wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan");
      return;
    }
    toast.success(decision === "COMPLETED" ? "Assignment disetujui." : "Assignment dikembalikan untuk revisi.");
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace"] });
    setDecision(null);
    setNotes("");
    router.push("/verifikator-workspace/approval-center");
  }

  return (
    <>
      <footer className="sticky bottom-0 flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#e4e7f2] bg-white px-7 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div>
          <div className="text-base font-extrabold text-[#1f2437]">Siap Mengambil Keputusan?</div>
          <div className="text-[13px] text-[#7d8398]">
            {quickStats.pendingReview > 0
              ? `${quickStats.pendingReview} dokumen/produk masih menunggu review.`
              : "Seluruh dokumen dan produk telah direview."}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => setDecision("RETURNED")}>
            <MaterialIcon name="undo" className="text-base" />
            Return for Revision
          </Button>
          <Button className="rounded-full bg-[#3454d1] hover:bg-[#2c46b3]" onClick={() => setDecision("COMPLETED")}>
            <MaterialIcon name="task_alt" className="text-base" />
            Approve
          </Button>
        </div>
      </footer>

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "COMPLETED" ? "Approve Assignment" : "Return Assignment for Revision"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {decision === "COMPLETED"
              ? "Assignment akan ditandai Completed dan proses verifikasi dinyatakan selesai."
              : "Assignment akan dikembalikan ke surveyor dengan status Returned untuk direvisi."}
          </p>
          <textarea
            className="w-full rounded-lg border border-input p-3 text-sm outline-none"
            rows={4}
            placeholder="Catatan keputusan (wajib diisi)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button onClick={submitDecision} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
