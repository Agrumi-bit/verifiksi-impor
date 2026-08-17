import type { Metadata } from "next";

import { AccountTabs } from "@/modules/surveyor-workspace/components/account-tabs";

export const metadata: Metadata = {
  title: "Account — Project Manager Workspace",
};

export default function ProjectManagerAccountPage() {
  return <AccountTabs />;
}
