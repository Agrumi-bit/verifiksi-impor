import type { Metadata } from "next";

import { ApplicationWizard } from "@/modules/applications/components/application-wizard";

export const metadata: Metadata = {
  title: "Edit Permohonan — Verifikasi Impor",
};

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-full bg-muted/30 px-4">
      <ApplicationWizard adminEditApplicationId={id} backHref={`/applications/${id}`} />
    </div>
  );
}
