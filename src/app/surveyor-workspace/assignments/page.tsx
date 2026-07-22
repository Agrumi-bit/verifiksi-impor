import type { Metadata } from "next";

import { AssignmentList } from "@/modules/surveyor-workspace/components/assignment-list";

export const metadata: Metadata = {
  title: "My Assignments — Surveyor Workspace",
};

export default function AssignmentsPage() {
  return <AssignmentList />;
}
