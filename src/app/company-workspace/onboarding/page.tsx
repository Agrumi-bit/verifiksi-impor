import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingScreen } from "@/modules/company-workspace/components/onboarding/onboarding-screen";
import { getBrandingSettings } from "@/lib/get-branding";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return { title: `Tambah Perusahaan — ${branding.appName}` };
}

export default function CompanyWorkspaceOnboardingPage() {
  return (
    <Suspense>
      <OnboardingScreen />
    </Suspense>
  );
}
