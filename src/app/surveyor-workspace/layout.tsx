"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/surveyor-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/surveyor-workspace/components/layout/side-nav-bar";

const FONT_LINKS = (
  <>
    <link
      href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
      rel="stylesheet"
    />
  </>
);

export default function SurveyorWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Assignment Detail (and its Verifikasi Lokasi wizard) is a standalone full-page
  // workspace with its own header, matching the design — it doesn't sit inside the
  // persistent Sidebar/TopNavBar chrome used by the rest of Surveyor Workspace.
  const isStandalonePage = /^\/surveyor-workspace\/assignments\/[^/]+/.test(pathname ?? "");

  if (isStandalonePage) {
    return (
      <div className="surveyor-theme min-h-screen bg-sv-background font-sv-body-md text-sv-on-surface">
        {FONT_LINKS}
        {children}
      </div>
    );
  }

  return (
    <div className="surveyor-theme min-h-screen bg-[#fbeee5] font-sv-body-md text-[#2b2420]">
      {FONT_LINKS}
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
