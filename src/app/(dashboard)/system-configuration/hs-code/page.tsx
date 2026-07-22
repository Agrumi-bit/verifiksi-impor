import type { Metadata } from "next";

import { HsCodeMasterDataPage } from "@/modules/master-data/components/hs-code-master-data-page";

export const metadata: Metadata = {
  title: "HS Code Master Data — Verifikasi Impor",
};

export default function Page() {
  return <HsCodeMasterDataPage />;
}
