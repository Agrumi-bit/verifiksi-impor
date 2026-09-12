"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ExistingBrandMatch = {
  brandName: string;
  brandOwnerName: string;
  registrationNumber: string | null;
};

type Props = {
  duplicate: ExistingBrandMatch | undefined;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
  onGoToStep: (step: number) => void;
};

/** Presentational — the actual existing-brand-name lookup (same lightweight
 * check Step 1 runs while typing) lives once in MerkWizard so the footer's
 * submit-gating and this summary never disagree about whether a duplicate
 * exists. See the Step 5 report for why "Gunakan Merek yang Ada" only
 * acknowledges the duplicate rather than linking/merging records. */
export function DuplicateCheckSummary({ duplicate, isAcknowledged, onAcknowledge, onGoToStep }: Props) {
  if (!duplicate) {
    return (
      <section className="rounded-xl border border-border p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-4" />
          Tidak ditemukan duplikasi merek pada permohonan ini.
        </p>
      </section>
    );
  }

  if (isAcknowledged) {
    return (
      <section className="rounded-xl border border-border p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-4" />
          Duplikasi merek telah dikonfirmasi.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="size-4" />
        Merek dengan nama yang sama ditemukan di IVP.
      </p>
      <div className="rounded-lg border border-amber-300 bg-background p-3 text-sm dark:border-amber-900">
        <p className="font-bold">{duplicate.brandName}</p>
        <p className="text-muted-foreground">{duplicate.brandOwnerName}</p>
        {duplicate.registrationNumber && (
          <p className="text-muted-foreground">Trademark: {duplicate.registrationNumber}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onAcknowledge}>
          Gunakan Merek yang Ada
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onGoToStep(1)}>
          Kembali ke Informasi Merek
        </Button>
      </div>
    </section>
  );
}
