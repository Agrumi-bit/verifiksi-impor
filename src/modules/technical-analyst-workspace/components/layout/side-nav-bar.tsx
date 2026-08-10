"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { cn } from "@/lib/utils";

const SIDE_NAV_LINKS = [
  { label: "Dashboard", href: "/technical-analyst-workspace", icon: "dashboard" },
  { label: "My Assignment", href: "/technical-analyst-workspace/my-assignment", icon: "assignment_ind" },
  { label: "My Schedule", href: "/technical-analyst-workspace/schedule", icon: "calendar_today" },
  { label: "Report", href: "/technical-analyst-workspace/reports", icon: "bar_chart" },
];

export function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col gap-0.5 border-r border-[#f0ded0] bg-[#fffaf6] py-5 md:flex">
      <div className="mb-3 border-b border-[#f0ded0] px-5 pb-4">
        <div className="text-[13px] font-extrabold leading-tight text-[#7a2e15]">
          Technical Analyst Workspace
        </div>
        <div className="mt-0.5 text-[11px] text-[#a68f80]">VKI &amp; VIU Feasibility Analysis</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {SIDE_NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/technical-analyst-workspace"
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px]",
                isActive
                  ? "bg-[#fdeadd] font-bold text-[#d9531f]"
                  : "font-medium text-[#4a4038] hover:bg-[#fdeadd]/60",
              )}
            >
              <MaterialIcon name={link.icon} filled={isActive} className="w-4 text-center text-[15px]" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3">
        <button
          type="button"
          onClick={() => toast.info("Notification Settings akan tersedia di iterasi berikutnya.")}
          className="w-full rounded-lg bg-[#e0662e] py-2.5 text-[13px] font-semibold text-white"
        >
          ⚙ Notification Settings
        </button>
      </div>
    </aside>
  );
}
