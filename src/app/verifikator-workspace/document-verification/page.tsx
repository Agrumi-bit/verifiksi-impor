import type { Metadata } from "next";

import { DocumentVerificationList } from "@/modules/verifikator-workspace/components/document-verification-list";

export const metadata: Metadata = {
  title: "Verifikasi Dokumen — Verifikator Workspace",
};

export default function VerifikatorDocumentVerificationPage() {
  return <DocumentVerificationList />;
}
