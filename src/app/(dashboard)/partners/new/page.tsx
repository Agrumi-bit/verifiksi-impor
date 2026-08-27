import type { Metadata } from "next";

import { PartnerForm } from "@/modules/partner/components/partner-form";

export const metadata: Metadata = {
  title: "Tambah Partner — Verifikasi Impor",
};

export default function NewPartnerPage() {
  return <PartnerForm />;
}
