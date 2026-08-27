import type { Metadata } from "next";

import { PartnerForm } from "@/modules/partner/components/partner-form";

export const metadata: Metadata = {
  title: "Edit Partner — Verifikasi Impor",
};

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartnerForm partnerId={id} />;
}
