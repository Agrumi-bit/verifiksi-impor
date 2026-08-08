"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function CompanyWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Survey report preview is a standalone, print-styled full page (shared with
  // Surveyor/Verifikator Workspace via ReportRouter) — it doesn't sit inside the
  // persistent Sidebar/Topbar chrome used by the rest of Company Workspace.
  const isStandalonePage = /^\/company-workspace\/assignments\/[^/]+/.test(pathname ?? "");

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        variant="company"
        brandTitle="VKI & VIU"
        brandSubtitle="Company Workspace"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
