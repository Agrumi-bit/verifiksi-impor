"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/verifikator-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/verifikator-workspace/components/layout/side-nav-bar";

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

export default function VerifikatorWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Assignment Detail is a standalone full-page workspace with its own header,
  // mirroring the Surveyor Workspace convention — it doesn't sit inside the
  // persistent Sidebar/TopNavBar chrome used by the rest of the workspace.
  const isStandalonePage = /^\/verifikator-workspace\/assignments\/[^/]+/.test(pathname ?? "");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] font-sans text-[#1f2437]">
        {FONT_LINKS}
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] font-sans text-[#1f2437]">
      {FONT_LINKS}
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#f6f7fb] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
