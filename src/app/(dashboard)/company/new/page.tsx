import type { Metadata } from "next";
import { Suspense } from "react";

import { CompanyWizard } from "@/modules/company/components/company-wizard";

export const metadata: Metadata = {
  title: "Add New Company — Verifikasi Impor",
};

export default function NewCompanyPage() {
  return (
    <Suspense>
      <CompanyWizard />
    </Suspense>
  );
}
