import type { Metadata } from "next";

import { AccountTabs } from "@/modules/surveyor-workspace/components/account-tabs";

export const metadata: Metadata = {
  title: "Account — Verifikator Workspace",
};

export default function VerifikatorAccountPage() {
  return <AccountTabs />;
}
