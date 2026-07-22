import type { Metadata } from "next";

import { AccountTabs } from "@/modules/surveyor-workspace/components/account-tabs";

export const metadata: Metadata = {
  title: "Account — Surveyor Workspace",
};

export default function SurveyorAccountPage() {
  return <AccountTabs />;
}
