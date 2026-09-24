import type { Metadata } from "next";

import { PartnerTable } from "@/modules/partner/components/partner-table";

export const metadata: Metadata = {
  title: "Partner Management — Verifikasi Impor",
};

export default function PartnersPage() {
  return <PartnerTable />;
}
