"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/verifikator-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/verifikator-workspace/components/layout/side-nav-bar";

export default function VerifikatorWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The A4 print-style reports (lokasi report, Laporan Verifikasi Dokumen) are standalone: they
  // shouldn't carry sidebar/top bar chrome, or "Save as PDF" prints it with the document.
  // Assignment Detail itself sits inside the normal Sidebar/TopNavBar shell.
  const isStandalonePage =
    /^\/verifikator-workspace\/assignments\/[^/]+\/(report\/|document-report)/.test(pathname ?? "") ||
    /^\/verifikator-workspace\/applications\/[^/]+\/formulir-permohonan/.test(pathname ?? "");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] font-sans text-[#1f2437]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] font-sans text-[#1f2437]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#f6f7fb] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
