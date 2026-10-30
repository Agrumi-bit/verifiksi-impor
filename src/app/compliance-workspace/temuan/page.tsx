import type { Metadata } from "next";
import { Suspense } from "react";

import { FindingsPage } from "@/modules/compliance-workspace/components/findings/findings-page";

export const metadata: Metadata = {
  title: "Temuan & Exception — Compliance Workspace",
};

export default function ComplianceTemuanPage() {
  return (
    <Suspense>
      <FindingsPage />
    </Suspense>
  );
}
