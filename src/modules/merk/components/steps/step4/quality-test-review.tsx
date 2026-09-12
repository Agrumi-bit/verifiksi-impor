"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import type { MerkWizardValues } from "../../../schema";

type Props = { form: UseFormReturn<MerkWizardValues> };

export function QualityTestReview({ form }: Props) {
  const qualityTests = useWatch({ control: form.control, name: "qualityTests" }) ?? [];

  if (qualityTests.length === 0) return null;

  return (
    <section className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-semibold">Hasil Uji Mutu</p>
      <ol className="flex flex-col gap-3">
        {qualityTests.map((qt, index) => (
          <li key={`${qt.certificateNumber}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{index + 1}.</p>
            <dl className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Komoditas</dt>
                <dd>{qt.commodityName}</dd>
              </div>
              {qt.commoditySubGroupName && (
                <div>
                  <dt className="text-xs text-muted-foreground">Subkomoditas</dt>
                  <dd>{qt.commoditySubGroupName}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Nomor Sertifikat</dt>
                <dd>{qt.certificateNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Laboratorium</dt>
                <dd>{qt.laboratoryName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tanggal Terbit</dt>
                <dd>{new Date(qt.issueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">File</dt>
                <dd className="truncate">{qt.fileName}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
