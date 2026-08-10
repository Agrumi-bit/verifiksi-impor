import type { Metadata } from "next";

import { AccountTabs } from "@/modules/surveyor-workspace/components/account-tabs";

export const metadata: Metadata = {
  title: "Account — Technical Analyst Workspace",
};

export default function TechnicalAnalystAccountPage() {
  return <AccountTabs />;
}
