import type { Metadata } from "next";

import { SignupScreen } from "@/modules/auth/components/signup-screen";
import { getBrandingSettings } from "@/lib/get-branding";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return { title: `Sign Up — ${branding.appName}` };
}

export default function SignupPage() {
  return <SignupScreen />;
}
