"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/project-manager-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/project-manager-workspace/components/layout/side-nav-bar";

export default function ProjectManagerWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // A4 print-style report pages (survey report + document verification report) are standalone,
  // same as every other workspace's equivalents — no sidebar chrome.
  const isStandalonePage = /^\/project-manager-workspace\/assignments\/[^/]+\/(report\/|document-report)/.test(pathname ?? "");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-[#fbeee5] font-sans text-[#2b2420]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbeee5] font-sans text-[#2b2420]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[230px]">
        {children}
      </main>
    </div>
  );
}
