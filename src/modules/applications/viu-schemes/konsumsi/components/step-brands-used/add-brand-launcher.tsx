"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { COMPANY_BRAND_SURFACE } from "@/modules/merk/surface";

type Props = {
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
 * Company-scoped only — Brand Master rows always belong to a `companyId`
 * (see MerkWizard's COMPANY_BRAND_SURFACE), and the applying company here is
 * always the signed-in session's own company. The generic/admin wizard entry
 * point (picking an arbitrary applicant company) has no equivalent
 * "create a Brand on behalf of another company" flow anywhere in Brand
 * Management today, so this launcher stays Company Workspace-only — see the
 * implementation report's Deferred Items.
 */
export function AddBrandLauncher({ applicationNumber, onBrandCreated, onBrandSavedAsDraft }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        + Tambah Merek Baru
      </Button>

      {isOpen && (
        <MerkWizard
          surface={COMPANY_BRAND_SURFACE}
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
