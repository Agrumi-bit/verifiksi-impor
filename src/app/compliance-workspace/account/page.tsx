import type { Metadata } from "next";

import { AccountTabs } from "@/modules/surveyor-workspace/components/account-tabs";

export const metadata: Metadata = {
  title: "Akun — Compliance Workspace",
};

export default function ComplianceAccountPage() {
  return <AccountTabs />;
}
