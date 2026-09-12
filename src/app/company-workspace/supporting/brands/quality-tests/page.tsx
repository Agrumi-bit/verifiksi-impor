import type { Metadata } from "next";

import { QualityTestsTable } from "@/modules/merk/components/management/quality-tests-table";

export const metadata: Metadata = {
  title: "Hasil Uji Mutu — Company Workspace",
};

export default function CompanyMerkQualityTestsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Hasil Uji Mutu</h1>
        <p className="text-sm text-muted-foreground">Hasil uji mutu merek milik perusahaan Anda.</p>
      </div>
      <QualityTestsTable
        fetchUrl="/api/company-workspace/brands/quality-tests"
        brandDetailHrefBase="/company-workspace/supporting/brands"
        showCompanyColumn={false}
      />
    </div>
  );
}
