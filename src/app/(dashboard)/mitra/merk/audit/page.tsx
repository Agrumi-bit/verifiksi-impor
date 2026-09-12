import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = {
  title: "Audit Trail Merek — Verifikasi Impor",
};

/** No audit logging infrastructure exists for Brand Management yet (no
 * AuditLog/ActivityLog model in the schema) — this stays a transparent
 * placeholder rather than a second, brand-only audit framework built ahead
 * of a platform-wide one. See the Merek Management navigation report. */
export default function MerkAuditPage() {
  return (
    <ComingSoon
      title="Audit Trail Belum Tersedia"
      description="Riwayat Perubahan, Aktivitas Pengguna, dan Riwayat Status akan tersedia di sini setelah sistem audit trail platform diimplementasikan."
    />
  );
}
