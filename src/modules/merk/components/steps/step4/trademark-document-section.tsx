"use client";

import { useActiveTrademarkClasses } from "@/modules/master-data/use-active-trademark-classes";
import {
  MERK_EVIDENCE_TYPE_LABELS,
  type MerkEvidenceType,
  type BrandDocumentEntryValues,
} from "../../../schema";
import type { BrandDocumentRequirement } from "../../../document-requirements";
import { BrandDocumentUploadCard } from "./brand-document-upload-card";

type Props = {
  requirement: BrandDocumentRequirement;
  evidenceType: MerkEvidenceType | undefined;
  registrationNumber: string | undefined;
  trademarkClass: string | undefined;
  value: BrandDocumentEntryValues | undefined;
  onChange: (value: BrandDocumentEntryValues | undefined) => void;
  error?: string;
};

/** Always-shown Section 1 — the Step 1 evidence type/number/class are
 * re-displayed read-only here rather than asked for again. */
export function TrademarkDocumentSection({
  requirement,
  evidenceType,
  registrationNumber,
  trademarkClass,
  value,
  onChange,
  error,
}: Props) {
  const { options: trademarkClassOptions } = useActiveTrademarkClasses();
  const classInfo = trademarkClassOptions.find((c) => c.value === trademarkClass);

  return (
    <details open className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Dokumen Merek</summary>
      <div className="mt-3 flex flex-col gap-3">
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Jenis Bukti Merek</dt>
            <dd className="font-semibold">{evidenceType ? MERK_EVIDENCE_TYPE_LABELS[evidenceType] : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nomor</dt>
            <dd className="font-semibold">{registrationNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kelas</dt>
            <dd className="font-semibold">
              {trademarkClass ? `${trademarkClass} — ${classInfo?.hint ?? ""}` : "—"}
            </dd>
          </div>
        </dl>

        <BrandDocumentUploadCard
          label={requirement.label}
          description={requirement.description}
          required={requirement.required}
          value={value}
          onChange={onChange}
          namespace="documents"
          error={error}
        />
      </div>
    </details>
  );
}
