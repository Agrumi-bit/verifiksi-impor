import Link from "next/link";

import { COMPLIANCE_HOME, COMPLIANCE_NAV } from "../navigation";

/**
 * Placeholder Dashboard while the workspace is built page by page — says plainly what is and isn't
 * available yet instead of showing invented figures. Replaced by the real Dashboard in the last phase.
 */
export function ComplianceHome() {
  const upcoming = COMPLIANCE_NAV.filter((item) => !item.available);
  const ready = COMPLIANCE_NAV.filter((item) => item.available && item.href !== COMPLIANCE_HOME);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">Compliance Workspace</h1>
        <p className="text-sm text-[#64748B]">
          Lapisan akhir verifikasi VIU – Barang Konsumsi: memantau, mengonsolidasi, menelusuri, mereview, dan mengaudit
          hasil Customer Relation, Surveyor, Verifikator, Technical Analyst, dan Project Manager.
        </p>
      </header>

      {ready.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {ready.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1677FF] px-3.5 py-2 text-[13px] font-medium text-white outline-none hover:bg-[#0F62D6] focus-visible:ring-2 focus-visible:ring-[#1677FF]/40"
              >
                <Icon className="size-4" aria-hidden />
                Buka {item.label}
              </Link>
            );
          })}
        </section>
      )}

      <section className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Sedang disiapkan</h2>
        <p className="mt-1 text-[13px] text-[#64748B]">Halaman berikut akan aktif bertahap.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {upcoming.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex items-center gap-2.5 rounded-lg bg-[#F5F7FA] px-3 py-2 text-[13px]">
                <Icon className="size-4 text-[#64748B]" aria-hidden />
                {item.label}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-[#64748B]">
        Compliance tidak membuat atau mengubah permohonan, tidak mengganti evidence, dan tidak menyetujui atau
        menerbitkan LHVIU.
      </p>
    </div>
  );
}
