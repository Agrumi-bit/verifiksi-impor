import { COMPLIANCE_NAV } from "../navigation";

/**
 * Placeholder Dashboard while the workspace is built page by page — says plainly what is and isn't
 * available yet instead of showing invented figures. Replaced by the real Dashboard in the last phase.
 */
export function ComplianceHome() {
  const upcoming = COMPLIANCE_NAV.filter((item) => !item.available);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">Compliance Workspace</h1>
        <p className="text-sm text-[#64748B]">
          Lapisan akhir verifikasi VIU – Barang Konsumsi: memantau, mengonsolidasi, menelusuri, mereview, dan mengaudit
          hasil Customer Relation, Surveyor, Verifikator, Technical Analyst, dan Project Manager.
        </p>
      </header>

      <section className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Sedang disiapkan</h2>
        <p className="mt-1 text-[13px] text-[#64748B]">Halaman berikut akan aktif bertahap, dimulai dari Daftar Permohonan.</p>
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
