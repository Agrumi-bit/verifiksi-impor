import type { Metadata } from "next";

import { ApplicationListView } from "@/modules/customer-relation-workspace/components/application-list-view";

export const metadata: Metadata = {
  title: "Application List — Customer Relation Workspace",
};

export default function CustomerRelationApplicationsPage() {
  return <ApplicationListView />;
}
