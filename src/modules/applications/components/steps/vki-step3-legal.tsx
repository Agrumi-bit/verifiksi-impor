"use client";

import { FileText } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { DocumentPreview } from "../document-preview";
import type { ApplicationWizardValues } from "../../schema";
import { splitKbliEntries } from "@/modules/shared/schema";

function fmtDate(value: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function LegalDocCard({
  title,
  desc,
  fields,
  documentPath,
}: {
  title: string;
  desc: string;
  fields: { label: string; value: string }[];
  documentPath?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border p-4.5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="size-4.5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_180px]">
        <div className="flex flex-wrap content-start gap-x-6 gap-y-3">
          {fields.map((f) => (
            <div key={f.label}>
              <div className="text-[11px] text-muted-foreground">{f.label}</div>
              <div className="mt-0.5 text-sm font-semibold">{f.value || "-"}</div>
            </div>
          ))}
        </div>
        <DocumentPreview path={documentPath} label={title} />
      </div>
    </div>
  );
}

type Props = { form: UseFormReturn<ApplicationWizardValues> };

export function VkiStep3Legal({ form }: Props) {
  const values = form.getValues();
  const hasAmendment = Boolean(values.notarialAmendmentNumber);
  const { utama: kbliUtama, pendukung: kbliPendukung } = splitKbliEntries(values.kbliEntries ?? []);
  const kbliUtamaSummary = kbliUtama.map((k) => `${k.code} - ${k.description}`).join(", ");
  const kbliPendukungSummary = kbliPendukung.map((k) => `${k.code} - ${k.description}`).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Data legal berikut diambil langsung dari data perusahaan terdaftar dan tidak perlu diisi ulang.
      </p>

      <LegalDocCard
        title="Nomor Induk Berusaha (NIB)"
        desc="Nomor identitas usaha yang diterbitkan melalui sistem OSS"
        fields={[
          { label: "Nomor NIB", value: values.nibNumber },
          { label: "Tanggal Terbit", value: fmtDate(values.nibIssueDate) },
        ]}
        documentPath={values.nibDocumentPath}
      />

      <LegalDocCard
        title="Akta Pendirian"
        desc="Akta pendirian perusahaan dari notaris"
        fields={[
          { label: "Nomor Akta", value: values.notarialDeedNumber },
          { label: "Tanggal Terbit", value: fmtDate(values.notarialDeedIssueDate) },
          { label: "Notaris", value: values.notarialIssuingAuthority },
        ]}
        documentPath={values.notarialDocumentPath}
      />

      {hasAmendment && (
        <LegalDocCard
          title="Akta Perubahan"
          desc="Akta perubahan terakhir perusahaan"
          fields={[
            { label: "Nomor Akta", value: values.notarialAmendmentNumber ?? "" },
            { label: "Tanggal Terbit", value: fmtDate(values.notarialAmendmentDate ?? "") },
            { label: "Notaris", value: values.notarialAmendmentAuthority ?? "" },
          ]}
          documentPath={values.notarialAmendmentDocPath}
        />
      )}

      <LegalDocCard
        title="SK Kemenkumham"
        desc="Surat Keputusan pengesahan badan hukum"
        fields={[
          { label: "Nomor SK", value: values.skNumber ?? "" },
          { label: "Tanggal Terbit", value: fmtDate(values.skDate ?? "") },
        ]}
        documentPath={values.skDocumentPath}
      />

      <LegalDocCard
        title="KBLI Utama"
        desc="Kode klasifikasi kegiatan usaha utama"
        fields={[{ label: "Kode & Uraian", value: kbliUtamaSummary }]}
        documentPath={values.kbliDocumentPath}
      />

      <LegalDocCard
        title="KBLI Pendukung"
        desc="Kode klasifikasi kegiatan usaha tambahan"
        fields={[{ label: "Kode & Uraian", value: kbliPendukungSummary || "Tidak ada KBLI pendukung" }]}
        documentPath={values.kbliDocumentPath}
      />
    </div>
  );
}
