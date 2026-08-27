"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/technical-analyst-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/technical-analyst-workspace/components/layout/side-nav-bar";

export default function TechnicalAnalystWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The A4 print-style report pages (survey report + document verification report) are
  // standalone, same as verifikator/company-workspace's equivalents — no sidebar chrome.
  const isStandalonePage = /^\/technical-analyst-workspace\/assignments\/[^/]+\/(report\/|document-report)/.test(pathname ?? "");

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
