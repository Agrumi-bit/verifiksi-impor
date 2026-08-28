"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useBranding, BRANDING_LOGO_URL } from "@/modules/branding/use-branding";

export default function CompanyWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: branding } = useBranding();
  // Survey report preview is a standalone, print-styled full page (shared with
  // Surveyor/Verifikator Workspace via ReportRouter) — it doesn't sit inside the
  // persistent Sidebar/Topbar chrome used by the rest of Company Workspace. Onboarding is
  // standalone too — a self-registered account with no companyId yet has nothing for the
  // Sidebar's company-scoped nav/data to show.
  const isStandalonePage =
    /^\/company-workspace\/assignments\/[^/]+/.test(pathname ?? "") || pathname === "/company-workspace/onboarding";

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        variant="company"
        brandTitle={branding?.sidebarBrandTitle ?? "VKI & VIU"}
        brandSubtitle="Company Workspace"
        logoUrl={branding?.logoPath ? BRANDING_LOGO_URL : null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
