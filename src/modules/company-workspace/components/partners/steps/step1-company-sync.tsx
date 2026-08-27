"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form/form-field";
import type { PartnerWizardValues } from "@/modules/partner/schema";

type CompanyMatch = {
  id: string;
  companyName: string;
  companyType: string;
  apiType: string | null;
};

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

export function Step1CompanySync({ form }: Props) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  const [isSyncing, setIsSyncing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [match, setMatch] = useState<CompanyMatch | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const companyId = form.watch("companyId");
  const companyName = form.watch("companyName");

  async function handleSync() {
    const [nib, npwp, sk] = form.getValues(["nibNumber", "npwpInput", "skInput"]);
    if (!nib || !npwp || !sk) {
      await form.trigger(["nibNumber", "npwpInput", "skInput"]);
      return;
    }

    setIsSyncing(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams({ nib, npwp, sk });
      const response = await fetch(`/api/partners/lookup?${params.toString()}`);
      const json = (await response.json()) as { data: CompanyMatch | null };
      if (!json.data) {
        setNotFound(true);
        return;
      }
      setMatch(json.data);
      setShowConfirm(true);
    } catch {
      setNotFound(true);
    } finally {
      setIsSyncing(false);
    }
  }

  function confirmMatch() {
    if (!match) return;
    setValue("companyId", match.id, { shouldValidate: true });
    setValue("companyName", match.companyName);
    setShowConfirm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Isi NIB, NPWP, dan SK Kemenkumham untuk mencari dan menyinkronkan perusahaan partner dari Directory
        Perusahaan.
      </p>

      {companyId ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3.5">
          <div className="text-xs text-muted-foreground">Perusahaan Tersinkron</div>
          <div className="mt-0.5 text-sm font-semibold">{companyName}</div>
        </div>
      ) : (
        <>
          <FormField label="NIB (Nomor Induk Berusaha)" required error={errors.nibNumber?.message}>
            <Input placeholder="Masukkan nomor NIB (13 digit)" {...register("nibNumber")} />
          </FormField>
          <FormField label="NPWP" required error={errors.npwpInput?.message}>
            <Input placeholder="Masukkan nomor NPWP (15 digit)" {...register("npwpInput")} />
          </FormField>
          <FormField label="SK Kemenkumham" required error={errors.skInput?.message}>
            <Input placeholder="Masukkan nomor SK Kemenkumham" {...register("skInput")} />
          </FormField>

          <Button type="button" variant="outline" className="self-start" disabled={isSyncing} onClick={handleSync}>
            {isSyncing ? "Menyinkronkan..." : "Sinkronisasi Perusahaan"}
          </Button>

          {notFound && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5">
              <p className="text-sm text-destructive">
                Data kredensial tidak sesuai atau perusahaan belum terdaftar di Directory Perusahaan.
              </p>
              <a
                href="/company/new"
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-sm font-semibold text-destructive underline"
              >
                + Tambah Perusahaan
              </a>
              <p className="text-xs text-muted-foreground">
                Belum terdaftar? Daftarkan perusahaan partner ini — form terbuka di tab baru, isian di sini tetap
                tersimpan. Setelah tersimpan, coba sinkronisasi lagi.
              </p>
            </div>
          )}
        </>
      )}

      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[90%] max-w-105 rounded-xl border border-border bg-background p-6"
          >
            <div className="text-base font-semibold">Perusahaan Ditemukan</div>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Data berikut sesuai dengan NIB, NPWP, dan SK Kemenkumham yang dimasukkan.
            </p>
            {match && (
              <div className="mb-5 rounded-lg border border-border p-3.5">
                <div className="text-sm font-semibold">{match.companyName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {match.companyType} · {match.apiType ?? "-"}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setShowConfirm(false)}>
                Batal
              </Button>
              <Button type="button" onClick={confirmMatch}>
                Lanjutkan sebagai Partner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
