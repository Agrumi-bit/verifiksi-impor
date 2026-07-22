import type { Metadata } from "next";

import { CompanyProfileTabs } from "@/modules/company-workspace/components/profile-tabs";

export const metadata: Metadata = {
  title: "Company Profile — Company Workspace",
};

export default function ProfilePage() {
  return <CompanyProfileTabs />;
}
