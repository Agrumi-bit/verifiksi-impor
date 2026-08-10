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
  readyForDecision: boolean;
};

export function DecisionPanel({ assignmentId, status, readyForDecision }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<"COMPLETED" | "RETURNED" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status !== "SUBMITTED") {
    return (
      <footer className="sticky bottom-0 flex flex-shrink-0 items-center justify-between gap-4 border-t border-[#f0ded0] bg-white px-7 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="text-sm text-[#4a4038]">
          {status === "COMPLETED" && (
            <span className="flex items-center gap-2 font-semibold text-[#1a9850]">
              <MaterialIcon name="task_alt" className="text-base" />
              Assignment ini telah disetujui.
            </span>
          )}
          {status === "RETURNED" && (
            <span className="flex items-center gap-2 font-semibold text-[#c1361f]">
              <MaterialIcon name="undo" className="text-base" />
              Assignment ini telah dikembalikan untuk revisi.
            </span>
          )}
          {status !== "COMPLETED" && status !== "RETURNED" && (
            <span className="text-[#8a7565]">Menunggu jadwal analisis teknis dimulai.</span>
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
    const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentId}/decision`, {
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
    queryClient.invalidateQueries({ queryKey: ["technical-analyst-workspace"] });
    setDecision(null);
    setNotes("");
    router.push("/technical-analyst-workspace/my-assignment");
  }

  return (
    <>
      <footer className="sticky bottom-0 flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#f0ded0] bg-white px-7 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div>
          <div className="text-base font-extrabold text-[#20180f]">Siap Mengambil Keputusan?</div>
          <div className="text-[13px] text-[#8a7565]">
            {readyForDecision ? "Seluruh modul analisis teknis telah dinilai." : "Masih ada modul analisis teknis yang belum dinilai."}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full border-[#e1bfb3] text-[#261813]"
            disabled={!readyForDecision}
            onClick={() => setDecision("RETURNED")}
          >
            <MaterialIcon name="undo" className="text-base" />
            Return for Revision
          </Button>
          <Button
            className="rounded-full bg-[#e0662e] hover:bg-[#c1361f]"
            disabled={!readyForDecision}
            onClick={() => setDecision("COMPLETED")}
          >
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
              ? "Assignment akan ditandai Completed dan proses analisis teknis dinyatakan selesai."
              : "Assignment akan dikembalikan untuk direvisi."}
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
            <Button onClick={submitDecision} disabled={isSubmitting} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
              {isSubmitting ? "Menyimpan..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
