import type { Metadata } from "next";

import { CrmView } from "@/modules/customer-relation-workspace/components/crm-view";

export const metadata: Metadata = {
  title: "CRM Kontak — Customer Relation Workspace",
};

export default function CustomerRelationCrmPage() {
  return <CrmView />;
}
