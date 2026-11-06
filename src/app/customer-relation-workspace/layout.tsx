"use client";

import { usePathname } from "next/navigation";
import { TopNavBar } from "@/modules/customer-relation-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/customer-relation-workspace/components/layout/side-nav-bar";

export default function CustomerRelationWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The printable Formulir Permohonan VKI is a standalone A4 page (no sidebar/top bar).
  if (/^\/customer-relation-workspace\/applications\/[^/]+\/formulir-permohonan/.test(pathname ?? "")) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen bg-[#fbeee5] font-sans text-[#2b2420]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
