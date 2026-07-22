"use client";

import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChecklistItemValues } from "../../schema";

type Props = {
  checklist: ChecklistItemValues[];
  evidenceCount: number;
  findingsCount: number;
  hasNotes: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: () => void;
};

export function ReviewTab({
  checklist,
  evidenceCount,
  findingsCount,
  hasNotes,
  isSubmitting,
  isSubmitted,
  onSubmit,
}: Props) {
  const reviewed = checklist.filter((item) => item.result !== null).length;
  const passCount = checklist.filter((item) => item.result === "PASS").length;
  const failCount = checklist.filter((item) => item.result === "FAIL").length;
  const naCount = checklist.filter((item) => item.result === "NA").length;
  const canSubmit = reviewed > 0 && !isSubmitted;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Verifikasi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Inspection Checklist</span>
            <span className="font-medium">
              {reviewed} / {checklist.length} item dinilai
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> {passCount} Pass
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="size-3.5 text-destructive" /> {failCount} Fail
            </span>
            <span className="flex items-center gap-1">
              <MinusCircle className="size-3.5" /> {naCount} N/A
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Evidence</span>
            <span className="font-medium">{evidenceCount} file diunggah</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Findings</span>
            <span className="font-medium">{findingsCount} temuan dicatat</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Survey Notes</span>
            <Badge variant={hasNotes ? "default" : "outline"}>
              {hasNotes ? "Terisi" : "Kosong"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {!isSubmitted && reviewed === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Isi minimal satu item Inspection Checklist sebelum submit report.
        </p>
      )}

      {isSubmitted ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Report ini sudah disubmit dan tidak dapat diubah lagi.
        </p>
      ) : (
        <Button disabled={!canSubmit || isSubmitting} onClick={onSubmit} className="self-start">
          {isSubmitting ? "Mengirim..." : "Submit Report"}
        </Button>
      )}
    </div>
  );
}
