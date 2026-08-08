import type { Metadata } from "next";

import { ApplicationWizard } from "@/modules/applications/components/application-wizard";
import type { VerificationType } from "@/modules/applications/schema";

export const metadata: Metadata = {
  title: "Create New Application — Verifikasi Impor",
};

function toVerificationType(value: string | string[] | undefined): VerificationType | undefined {
  return value === "VKI" || value === "VIU" ? value : undefined;
}

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  return (
    <div className="min-h-full bg-muted/30 px-4">
      <ApplicationWizard lockedVerificationType={toVerificationType(type)} />
    </div>
  );
}
