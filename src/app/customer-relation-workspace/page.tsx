import type { Metadata } from "next";

import { QueueView } from "@/modules/customer-relation-workspace/components/queue-view";

export const metadata: Metadata = {
  title: "Incoming Applications — Customer Relation Workspace",
};

export default function CustomerRelationQueuePage() {
  return <QueueView />;
}
