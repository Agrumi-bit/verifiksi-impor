"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VKI_SUPPORT_DOC_DEFS, type ApplicationWizardValues } from "../../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  onEditStep: (step: number) => void;
};

function SummarySection({
  title,
  step,
  onEditStep,
  children,
}: {
  title: string;
  step: number;
  onEditStep: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(step)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export function VkiStep13Preview({ form, onEditStep }: Props) {
  const values = useWatch({ control: form.control });

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Tinjau kembali seluruh data sebelum submit. Klik &quot;Edit&quot; untuk kembali ke step terkait jika ada
        yang perlu diperbaiki.
      </p>

      <SummarySection title="1. Company Information" step={1} onEditStep={onEditStep}>
        <SummaryItem label="Perusahaan" value={values.companyName} />
        <SummaryItem label="Jenis API" value={values.companyApiType} />
        <SummaryItem label="Tipe Perusahaan" value={values.companyType} />
        <SummaryItem label="Status Investasi" value={values.investmentStatus} />
        <SummaryItem label="Email" value={values.companyEmail} />
        <SummaryItem label="Telepon" value={values.companyPhone} />
        <SummaryItem label="PIC" value={`${values.contactFullName ?? ""} (${values.contactDesignation ?? ""})`} />
        <SummaryItem label="Kontak PIC" value={`${values.contactPhone ?? ""} · ${values.contactEmail ?? ""}`} />
      </SummarySection>

      <SummarySection title="2. Application Information" step={2} onEditStep={onEditStep}>
        <SummaryItem label="Jenis Verifikasi" value={values.verificationType} />
        <SummaryItem label="Kategori Permohonan" value={values.applicationCategory} />
      </SummarySection>

      <SummarySection title="3. Legal Information" step={3} onEditStep={onEditStep}>
        <SummaryItem label="Nomor NIB" value={values.nibNumber} />
        <SummaryItem label="Nomor Akta" value={values.notarialDeedNumber} />
        <SummaryItem label="Nomor SK Kemenkumham" value={values.skNumber ?? undefined} />
        <SummaryItem
          label="KBLI"
          value={(values.kbliEntries ?? []).map((k) => k?.code).filter(Boolean).join(", ")}
        />
      </SummarySection>

      <SummarySection title="4. Tax Information" step={4} onEditStep={onEditStep}>
        <SummaryItem label="NPWP" value={values.npwpNumber ?? undefined} />
      </SummarySection>

      <SummarySection title="5. Location Information" step={5} onEditStep={onEditStep}>
        <SummaryItem label="Jumlah Lokasi" value={String((values.locations ?? []).length)} />
        <SummaryItem
          label="Lokasi"
          value={(values.locations ?? []).map((l) => `${l?.locationType} — ${l?.city}`).join(", ")}
        />
      </SummarySection>

      <SummarySection title="6. Support Document" step={6} onEditStep={onEditStep}>
        <SummaryItem
          label="Dokumen Terisi"
          value={`${(values.vkiSupportDocs ?? []).filter((d) => d?.documentPath).length} / ${VKI_SUPPORT_DOC_DEFS.length}`}
        />
        <SummaryItem label="Bukti Bayar Listrik" value={`${(values.electricityMonths ?? []).length} bulan`} />
        <SummaryItem label="Data Tenaga Kerja" value={`${(values.tenagaKerjaEntries ?? []).length} kategori`} />
      </SummarySection>

      <SummarySection title="7. Data Mesin" step={7} onEditStep={onEditStep}>
        <SummaryItem label="Jumlah Mesin" value={String((values.machines ?? []).length)} />
        <SummaryItem
          label="Mesin"
          value={(values.machines ?? []).map((m) => m?.nama).filter(Boolean).join(", ")}
        />
      </SummarySection>

      <SummarySection title="8. Product Information" step={8} onEditStep={onEditStep}>
        <SummaryItem label="Jumlah Produk" value={String((values.products ?? []).length)} />
        <SummaryItem label="Jumlah Bahan Baku" value={String((values.rawMaterials ?? []).length)} />
      </SummarySection>

      <SummarySection title="9. Kapasitas" step={9} onEditStep={onEditStep}>
        <SummaryItem label="Baris Terisi" value={String((values.capacity ?? []).length)} />
        <SummaryItem label="Dokumen Pembuktian" value={values.capacityDocumentPath ? "Terunggah" : "Belum diunggah"} />
      </SummarySection>

      <SummarySection title="10. Jumlah Produksi" step={10} onEditStep={onEditStep}>
        <SummaryItem label="Baris Terisi" value={String((values.productionQty ?? []).length)} />
      </SummarySection>

      <SummarySection title="11. Bahan Baku yang Digunakan" step={11} onEditStep={onEditStep}>
        <SummaryItem label="Baris Terisi" value={String((values.rawMaterialUsage ?? []).length)} />
      </SummarySection>

      <SummarySection title="12. Penjualan" step={12} onEditStep={onEditStep}>
        <SummaryItem label="Baris Terisi" value={String((values.sales ?? []).length)} />
      </SummarySection>
    </div>
  );
}
