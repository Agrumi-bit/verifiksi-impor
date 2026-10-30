import { SideNavBar } from "@/modules/compliance-workspace/components/layout/side-nav-bar";
import { TopNavBar } from "@/modules/compliance-workspace/components/layout/top-nav-bar";

export default function ComplianceWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-[Inter,sans-serif] text-[#10233F]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen pt-[60px] md:ml-[232px]">{children}</main>
    </div>
  );
}
