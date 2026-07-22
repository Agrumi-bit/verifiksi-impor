import type { Metadata } from "next";

import { AssignmentList } from "@/modules/verifikator-workspace/components/assignment-list";

export const metadata: Metadata = {
  title: "My Assignment — Verifikator Workspace",
};

export default function MyAssignmentPage() {
  return <AssignmentList />;
}
