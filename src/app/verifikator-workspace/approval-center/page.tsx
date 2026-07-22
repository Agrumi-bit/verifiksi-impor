import type { Metadata } from "next";

import { ApprovalCenter } from "@/modules/verifikator-workspace/components/approval-center";

export const metadata: Metadata = {
  title: "Approval Center — Verifikator Workspace",
};

export default function ApprovalCenterPage() {
  return <ApprovalCenter />;
}
