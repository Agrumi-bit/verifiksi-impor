import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginScreen } from "@/modules/auth/components/login-screen";
import { getBrandingSettings } from "@/lib/get-branding";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return { title: `Login — ${branding.appName}` };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
