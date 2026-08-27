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
  // Only the A4 print-style report preview is standalone (it mirrors the
  // Surveyor Workspace's own report view and shouldn't carry sidebar chrome).
  // Assignment Detail itself sits inside the normal Sidebar/TopNavBar shell.
  const isStandalonePage = /^\/verifikator-workspace\/assignments\/[^/]+\/report\//.test(pathname ?? "");

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
