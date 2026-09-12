"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ReadinessChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  step?: number;
  issueLabel?: string;
};

type Props = {
  brandName: string;
  classLabel?: string;
  countryLabel?: string;
  ownerTitle?: string;
  importerTitle?: string;
  documentsCompleteCount: number;
  documentsTotalCount: number;
  checklist: ReadinessChecklistItem[];
  isReady: boolean;
  onGoToStep: (step: number) => void;
};

export function BrandReadinessSummary({
  brandName,
  classLabel,
  countryLabel,
  ownerTitle,
  importerTitle,
  documentsCompleteCount,
  documentsTotalCount,
  checklist,
  isReady,
  onGoToStep,
}: Props) {
  const issues = checklist.filter((item) => !item.ok);

  return (
    <div className="flex flex-col gap-4">
      {/* Top compact brand summary */}
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="min-w-0">
          <p className="text-lg font-bold">{brandName || "Merek belum diberi nama"}</p>
          {classLabel && <p className="text-xs text-muted-foreground">{classLabel}</p>}
          {countryLabel && <p className="text-xs text-muted-foreground">{countryLabel}</p>}
          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Pemilik Merek</dt>
              <dd className="truncate font-medium">{ownerTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Importir</dt>
              <dd className="truncate font-medium">{importerTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dokumen</dt>
              <dd className="font-medium">
                {documentsCompleteCount} / {documentsTotalCount} Lengkap
              </dd>
            </div>
          </dl>
        </div>
        <span
          className={
            isReady
              ? "shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600"
              : "shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400"
          }
        >
          {isReady ? "Siap Ditambahkan" : "Belum Lengkap"}
        </span>
      </div>

      {/* Global readiness checklist */}
      <section className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Kesiapan Submit</p>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {item.ok ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span className={item.ok ? "" : "text-destructive"}>{item.label}</span>
            </li>
          ))}
        </ul>

        {issues.length > 0 && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive">
              Belum dapat ditambahkan — {issues.length} persyaratan belum lengkap:
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {issues.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-destructive">• {item.issueLabel ?? item.label}</span>
                  {item.step && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => onGoToStep(item.step!)}
                    >
                      Perbaiki
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
