"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/project-manager-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/project-manager-workspace/components/layout/side-nav-bar";

const FONT_LINKS = (
  <>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
      rel="stylesheet"
    />
  </>
);

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
        {FONT_LINKS}
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbeee5] font-sans text-[#2b2420]">
      {FONT_LINKS}
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[230px]">
        {children}
      </main>
    </div>
  );
}
