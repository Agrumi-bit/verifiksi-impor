"use client";

import { TopNavBar } from "@/modules/customer-relation-workspace/components/layout/top-nav-bar";
import { SideNavBar } from "@/modules/customer-relation-workspace/components/layout/side-nav-bar";

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

export default function CustomerRelationWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbeee5] font-sans text-[#2b2420]">
      {FONT_LINKS}
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen overflow-y-auto bg-[#fbeee5] pt-[60px] md:ml-[220px]">
        {children}
      </main>
    </div>
  );
}
