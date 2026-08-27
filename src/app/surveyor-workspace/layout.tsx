"use client";

import { usePathname } from "next/navigation";

import { TopNavBar } from "@/modules/surveyor-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/surveyor-workspace/components/layout/side-nav-bar";

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
        {children}
      </div>
    );
  }

  return (
    <div className="surveyor-theme min-h-screen bg-[#fbeee5] font-sv-body-md text-[#2b2420]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
