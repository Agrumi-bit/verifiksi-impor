"use client";

import { TopNavBar } from "@/modules/customer-relation-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/customer-relation-workspace/components/layout/side-nav-bar";

export default function CustomerRelationWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
