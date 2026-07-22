import type { Metadata } from "next";

import { CompanyTable } from "@/modules/company/components/company-table";

export const metadata: Metadata = {
  title: "Company Registry — Verifikasi Impor",
};

export default function CompanyPage() {
  return <CompanyTable />;
}
