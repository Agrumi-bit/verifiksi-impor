"use client";

import { usePathname } from "next/navigation";

import { SideNavBar } from "./side-nav-bar";
import { TopNavBar } from "./top-nav-bar";

/** A4 report pages (Laporan Hasil Compliance) are standalone — no workspace chrome, like every other workspace's reports. */
const STANDALONE = /^\/compliance-workspace\/permohonan\/[^/]+\/report\/?$/;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE.test(pathname ?? "")) return <div className="min-h-screen">{children}</div>;
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-[Inter,sans-serif] text-[#10233F]">
      <TopNavBar />
      <SideNavBar />
      <main className="min-h-screen pt-[60px] md:ml-[232px]">{children}</main>
    </div>
  );
}
