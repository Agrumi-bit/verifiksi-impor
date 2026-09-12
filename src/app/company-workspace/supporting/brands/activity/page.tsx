import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = {
  title: "Riwayat Aktivitas Merek — Company Workspace",
};

/** No activity-log infrastructure exists for Brand Management yet — see the
 * Merek Management navigation report. */
export default function CompanyMerkActivityPage() {
  return (
    <ComingSoon
      title="Riwayat Aktivitas Belum Tersedia"
      description="Riwayat perubahan merek, dokumen, dan hasil uji mutu perusahaan Anda akan tersedia di sini setelah sistem pencatatan aktivitas diimplementasikan."
    />
  );
}
