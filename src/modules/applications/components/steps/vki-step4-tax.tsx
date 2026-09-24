"use client";

import { Banknote, FileCheck2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { DocumentPreview } from "../document-preview";
import { TAX_PROOF_TYPE_LABELS } from "@/modules/company/schema";
import type { ApplicationWizardValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

export function VkiStep4Tax({ form }: Props) {
  const values = form.getValues();
  const taxProofs = (values.taxProofs ?? []).filter((tp) => tp.type);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Data pajak berikut diambil langsung dari data perusahaan terdaftar dan tidak perlu diisi ulang.
      </p>
      <div className="rounded-xl border border-border p-4.5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Banknote className="size-4.5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">NPWP</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Nomor Pokok Wajib Pajak perusahaan</div>
          </div>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_180px]">
          <div>
            <div className="text-[11px] text-muted-foreground">Nomor NPWP</div>
            <div className="mt-0.5 text-sm font-semibold">{values.npwpNumber || "-"}</div>
          </div>
          <DocumentPreview path={values.npwpDocumentPath} label="NPWP" />
        </div>
      </div>

      {values.companyAge === "UNDER_3" && (
        <div className="rounded-xl border border-border p-4.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileCheck2 className="size-4.5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold">Surat Keterangan Terdaftar (SKT) Pajak</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Pengganti bukti pembayaran pajak 3 tahun terakhir — perusahaan berdiri kurang dari 3 tahun
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_180px]">
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[11px] text-muted-foreground">Nomor Surat</div>
                <div className="mt-0.5 text-sm font-semibold">{values.sktNumber || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Lembaga Penerbit</div>
                <div className="mt-0.5 text-sm font-semibold">{values.sktIssuer || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Tanggal Diterbitkan</div>
                <div className="mt-0.5 text-sm font-semibold">{values.sktDate || "-"}</div>
              </div>
            </div>
            <DocumentPreview path={values.sktDocumentPath} label="SKT" />
          </div>
        </div>
      )}

      {values.companyAge === "OVER_3" && (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-muted-foreground">Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir</p>
          {taxProofs.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4.5 text-center text-xs text-muted-foreground">
              Perusahaan belum melengkapi bukti pembayaran pajak.
            </div>
          )}
          {taxProofs.map((tp, index) => (
            <div key={index} className="rounded-xl border border-border p-4.5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileCheck2 className="size-4.5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    {tp.type ? TAX_PROOF_TYPE_LABELS[tp.type] : ""} — {tp.year}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Bukti bayar pajak tahun {tp.year}</div>
                </div>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_180px]">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Nomor</div>
                    <div className="mt-0.5 text-sm font-semibold">{tp.nomor || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Tanggal</div>
                    <div className="mt-0.5 text-sm font-semibold">{tp.tanggal || "-"}</div>
                  </div>
                </div>
                <DocumentPreview path={tp.docPath} label={tp.type ? TAX_PROOF_TYPE_LABELS[tp.type] : "Bukti Pajak"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
