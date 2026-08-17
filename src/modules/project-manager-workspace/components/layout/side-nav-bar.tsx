"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    key: "VKI",
    label: "VKI",
    icon: "factory",
    children: [
      { label: "Dashboard", href: "/project-manager-workspace/vki", icon: "space_dashboard" },
      { label: "Application List", href: "/project-manager-workspace/applications/VKI", icon: "assignment" },
      { label: "Report", href: "/project-manager-workspace/reports/VKI", icon: "summarize" },
    ],
  },
  {
    key: "VIU",
    label: "VIU",
    icon: "inventory",
    children: [
      { label: "Dashboard", href: "/project-manager-workspace/viu", icon: "space_dashboard" },
      { label: "Application List", href: "/project-manager-workspace/applications/VIU", icon: "assignment" },
      { label: "Report", href: "/project-manager-workspace/reports/VIU", icon: "summarize" },
    ],
  },
];

export function SideNavBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    VKI: pathname.startsWith("/project-manager-workspace/vki") || pathname.startsWith("/project-manager-workspace/applications/VKI") || pathname.startsWith("/project-manager-workspace/reports/VKI"),
    VIU: pathname.startsWith("/project-manager-workspace/viu") || pathname.startsWith("/project-manager-workspace/applications/VIU") || pathname.startsWith("/project-manager-workspace/reports/VIU"),
  });

  const isDashboardActive = pathname === "/project-manager-workspace";

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[230px] flex-col gap-0.5 border-r border-[#f0ded0] bg-[#fffaf6] py-5 md:flex">
      <div className="mb-3 border-b border-[#f0ded0] px-5 pb-4">
        <div className="text-[13px] font-extrabold leading-tight text-[#7a2e15]">Project Manager Workspace</div>
        <div className="mt-0.5 text-[11px] text-[#a68f80]">Persetujuan Lintas Unit</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        <Link
          href="/project-manager-workspace"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px]",
            isDashboardActive ? "bg-[#fdeadd] font-bold text-[#d9531f]" : "font-medium text-[#4a4038] hover:bg-[#fdeadd]/60",
          )}
        >
          <MaterialIcon name="dashboard" filled={isDashboardActive} className="w-4 text-center text-[15px]" />
          <span>Dashboard</span>
        </Link>

        {GROUPS.map((group) => {
          const isOpen = expanded[group.key];
          const isActiveGroup = group.children.some((c) => pathname.startsWith(c.href));
          return (
            <div key={group.key}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded((prev) => ({ ...prev, [group.key]: !isOpen }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpanded((prev) => ({ ...prev, [group.key]: !isOpen }));
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px]",
                  isActiveGroup ? "font-bold text-[#d9531f]" : "font-medium text-[#4a4038] hover:bg-[#fdeadd]/60",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name={group.icon} className="w-4 text-center text-[15px]" />
                  <span>{group.label}</span>
                </div>
                <MaterialIcon name={isOpen ? "expand_less" : "expand_more"} className="text-[16px]" />
              </div>
              {isOpen && (
                <div className="ml-3.5 mb-1 mt-0.5 flex flex-col gap-0.5 border-l-[1.5px] border-[#f0ded0] pl-3">
                  {group.children.map((child) => {
                    const isActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px]",
                          isActive ? "bg-[#fdeadd] font-bold text-[#c14a1f]" : "font-medium text-[#7a6b5c] hover:bg-[#fdeadd]/60",
                        )}
                      >
                        <MaterialIcon name={child.icon} className="w-3.5 text-center text-[14px]" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
