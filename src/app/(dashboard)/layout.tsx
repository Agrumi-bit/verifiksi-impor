import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getBrandingSettings } from "@/lib/get-branding";
import { BRANDING_LOGO_URL } from "@/modules/branding/use-branding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getBrandingSettings();
  return (
    <div className="flex h-screen">
      <Sidebar
        variant="admin"
        brandTitle={branding.sidebarBrandTitle}
        brandSubtitle={branding.sidebarBrandSubtitle}
        logoUrl={branding.logoPath ? BRANDING_LOGO_URL : null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
