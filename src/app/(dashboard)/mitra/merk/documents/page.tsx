import type { Metadata } from "next";

import { AdminDocumentsMonitoring } from "@/modules/merk/components/management/admin-documents-monitoring";

export const metadata: Metadata = {
  title: "Dokumen & Monitoring — Verifikasi Impor",
};

/** Merged "Dokumen" + "Monitoring" — see the navigation report. Kept at the
 * existing /documents path (rather than adding yet another route) so the
 * one surviving link just changes what it points to. */
export default function MerkDocumentsMonitoringPage() {
  return <AdminDocumentsMonitoring />;
}
