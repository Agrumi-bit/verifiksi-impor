"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { COMPANY_BRAND_SURFACE, INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";

type Props = {
  /** Admin/generic wizard entry point vs Company Workspace — same split as StepBrandsUsed's apiBase. */
  isAdminSurface: boolean;
  /** The applying company — owner of a brand an admin creates here on its behalf. */
  companyId?: string;
  applicationNumber?: string;
  onBrandCreated: (brandId: string) => void;
  onBrandSavedAsDraft: () => void;
};

/**
 * "+ Tambah Merek Baru" — reuses the Add Brand Wizard as-is (no second
 * implementation). Rendered as a same-page overlay, so "return automatically
 * to Step 6" is just closing it: this component never navigates away from
 * the VIU wizard in the first place.
 *
 * In Company Workspace the brand is created through COMPANY_BRAND_SURFACE and owned by the
 * signed-in user's company. From the admin/generic wizard the session has no company of its
 * own (the company endpoint would refuse with "Akun Anda belum terhubung dengan perusahaan
 * manapun"), so it goes through INTERNAL_MERK_SURFACE instead, owned by the applying company.
 */
export function AddBrandLauncher({ isAdminSurface, companyId, applicationNumber, onBrandCreated, onBrandSavedAsDraft }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        + Tambah Merek Baru
      </Button>

      {isOpen && (
        <MerkWizard
          surface={isAdminSurface ? INTERNAL_MERK_SURFACE : COMPANY_BRAND_SURFACE}
          companyId={isAdminSurface ? companyId : undefined}
          onClose={() => setIsOpen(false)}
          contextBanner={
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Merek ini akan digunakan untuk Permohonan VIU Barang Konsumsi
                {applicationNumber ? ` ${applicationNumber}` : ""}.
              </span>
            </div>
          }
          onBrandSaved={(result) => {
            setIsOpen(false);
            if (result.status === "ACTIVE") onBrandCreated(result.id);
            else onBrandSavedAsDraft();
          }}
        />
      )}
    </>
  );
}
