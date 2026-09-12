import type { Metadata } from "next";

import { BrandDocumentsTable } from "@/modules/merk/components/management/admin-documents";

export const metadata: Metadata = {
  title: "Dokumen Merek — Company Workspace",
};

export default function CompanyMerkDocumentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Dokumen</h1>
        <p className="text-sm text-muted-foreground">Dokumen merek milik perusahaan Anda.</p>
      </div>
      <BrandDocumentsTable
        fetchUrl="/api/company-workspace/brands/documents"
        brandDetailHrefBase="/company-workspace/supporting/brands"
        showCompanyColumn={false}
      />
    </div>
  );
}
