import type { Metadata } from "next";

import { BrandDraftsTable } from "@/modules/merk/components/management/brand-drafts-table";
import { COMPANY_BRAND_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Draft Merek — Company Workspace",
};

export default function CompanyMerkDraftsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Draft</h1>
        <p className="text-sm text-muted-foreground">
          Merek perusahaan Anda yang belum diselesaikan pengisiannya.
        </p>
      </div>
      <BrandDraftsTable
        surface={COMPANY_BRAND_SURFACE}
        fetchUrl="/api/company-workspace/brands/drafts"
        showCompanyColumn={false}
      />
    </div>
  );
}
