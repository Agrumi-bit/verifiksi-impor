import type { Metadata } from "next";

import { PartnerWizard } from "@/modules/partner/components/partner-wizard";

export const metadata: Metadata = {
  title: "Tambah Partner — Verifikasi Impor",
};

export default function NewPartnerPage() {
  return <PartnerWizard />;
}
