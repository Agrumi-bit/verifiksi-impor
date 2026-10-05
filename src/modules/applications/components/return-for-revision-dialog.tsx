"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getReturnEligibility, RETURN_REASON_MIN_LENGTH, returnSectionOptions } from "../return-rules";

type Props = {
  /** `/api/customer-relation-workspace/applications/{id}/return` or `/api/applications/{id}/return`. */
  endpoint: string;
  applicationNumber: string;
  status: string;
  assignmentStatuses: readonly string[];
  verificationType: string;
  importTypes: readonly string[];
  onReturned: () => void;
  /** Trigger look — CR/admin detail headers use a full button, the list row menu a compact one. */
  variant?: "button" | "menu-item";
};

/**
 * "Kembalikan untuk Revisi" — trigger + dialog (reason, sections to fix, confirm). The trigger is
 * shown disabled with the reason as tooltip when the application can't be returned; the server
 * enforces the same rule (return-rules.ts) regardless of what the UI allows.
 */
export function ReturnForRevisionDialog({
  endpoint,
  applicationNumber,
  status,
  assignmentStatuses,
  verificationType,
  importTypes,
  onReturned,
  variant = "button",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eligibility = getReturnEligibility(status, assignmentStatuses);
  const options = returnSectionOptions(verificationType, importTypes);
  const reasonTooShort = reason.trim().length < RETURN_REASON_MIN_LENGTH;

  function open() {
    setReason("");
    setSections([]);
    setIsConfirming(false);
    setIsOpen(true);
  }

  function toggleSection(key: string, checked: boolean) {
    setSections((current) => (checked ? [...current, key] : current.filter((k) => k !== key)));
  }

  async function submit() {
    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), sections }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Gagal mengembalikan permohonan");
        setIsConfirming(false);
        return;
      }
      toast.success(`Permohonan ${applicationNumber} dikembalikan ke perusahaan untuk direvisi.`);
      setIsOpen(false);
      onReturned();
    } catch {
      toast.error("Gagal mengembalikan permohonan");
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabledReason = eligibility.allowed ? undefined : eligibility.reason;

  return (
    <>
      {variant === "button" ? (
        <span title={disabledReason}>
          <button
            type="button"
            onClick={open}
            disabled={!eligibility.allowed}
            className="flex items-center gap-1.5 rounded-lg border border-[#e5a5a5] bg-white px-3.5 py-1.75 text-[12.5px] font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 className="size-4" />
            Kembalikan untuk Revisi
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={!eligibility.allowed}
          title={disabledReason}
          className="flex items-center gap-1 text-left text-[11.5px] font-semibold text-[#b42318] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
        >
          <Undo2 className="size-3.5" />
          Kembalikan untuk Revisi
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={(next) => !isSubmitting && setIsOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kembalikan untuk Revisi — {applicationNumber}</DialogTitle>
          </DialogHeader>

          {!isConfirming ? (
            <div className="flex flex-col gap-4 text-sm">
              <label className="flex flex-col gap-1.5">
                <span className="font-semibold">
                  Alasan pengembalian <span className="text-destructive">*</span>
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan apa yang perlu diperbaiki perusahaan..."
                  className="rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <span className={`text-xs ${reasonTooShort ? "text-muted-foreground" : "text-emerald-700"}`}>
                  Minimal {RETURN_REASON_MIN_LENGTH} karakter ({reason.trim().length}/{RETURN_REASON_MIN_LENGTH}).
                </span>
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold">Bagian yang perlu diperbaiki (opsional)</span>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {options.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={sections.includes(option.key)}
                        onChange={(e) => toggleSection(option.key, e.target.checked)}
                      />
                      {option.title}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                Permohonan <strong>{applicationNumber}</strong> akan berstatus <strong>RETURNED</strong> dan dikembalikan ke
                perusahaan untuk direvisi. Perusahaan akan melihat alasan berikut:
              </p>
              <p className="rounded-lg bg-muted p-2.5 italic">{reason.trim()}</p>
              {sections.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Bagian: {options.filter((o) => sections.includes(o.key)).map((o) => o.title).join(", ")}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {!isConfirming ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Batal
                </Button>
                <Button type="button" variant="destructive" disabled={reasonTooShort} onClick={() => setIsConfirming(true)}>
                  Lanjutkan
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsConfirming(false)}>
                  Kembali
                </Button>
                <Button type="button" variant="destructive" disabled={isSubmitting} onClick={submit}>
                  {isSubmitting ? "Mengembalikan..." : "Ya, Kembalikan"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
