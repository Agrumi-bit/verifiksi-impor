import type { Metadata } from "next";

import { ApplicationTable } from "@/modules/applications/components/application-table";

export const metadata: Metadata = {
  title: "Application List — Verifikasi Impor",
};

export default function ApplicationsPage() {
  return <ApplicationTable />;
}
