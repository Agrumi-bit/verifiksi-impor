"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { cn } from "@/lib/utils";
import { PM_VIU_SCHEMES, PM_VIU_SCHEME_PAGES, viuSchemeHref, type PmViuScheme } from "../../viu-schemes";

const VKI_GROUP = {
  key: "VKI",
  label: "VKI",
  icon: "factory",
  children: [
    { label: "Dashboard", href: "/project-manager-workspace/vki", icon: "space_dashboard" },
    { label: "Application List", href: "/project-manager-workspace/applications/VKI", icon: "assignment" },
    { label: "Report", href: "/project-manager-workspace/reports/VKI", icon: "summarize" },
  ],
};

const VIU_ROOT = "/project-manager-workspace/viu";

/** Expandable row — same look for the VKI / VIU groups and for each VIU sub menu. */
function GroupHeader({
  label,
  icon,
  isOpen,
  isActive,
  onToggle,
  nested = false,
}: {
  label: string;
  icon: string;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  nested?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 text-[13.5px]",
        nested ? "py-2 text-[12.5px]" : "py-2.5",
        isActive ? "font-bold text-[#d9531f]" : "font-medium text-[#4a4038] hover:bg-[#fdeadd]/60",
      )}
    >
      <div className="flex items-center gap-2.5">
        <MaterialIcon name={icon} className="w-4 text-center text-[15px]" />
        <span>{label}</span>
      </div>
      <MaterialIcon name={isOpen ? "expand_less" : "expand_more"} className="text-[16px]" />
    </div>
  );
}

function NavLinks({ pathname, links }: { pathname: string; links: { label: string; href: string; icon: string; exact?: boolean }[] }) {
  return (
    <div className="ml-3.5 mb-1 mt-0.5 flex flex-col gap-0.5 border-l-[1.5px] border-[#f0ded0] pl-3">
      {links.map((link) => {
        const isActive = pathname === link.href || (!link.exact && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px]",
              isActive ? "bg-[#fdeadd] font-bold text-[#c14a1f]" : "font-medium text-[#7a6b5c] hover:bg-[#fdeadd]/60",
            )}
          >
            <MaterialIcon name={link.icon} className="w-3.5 text-center text-[14px]" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function schemeLinks(scheme: PmViuScheme) {
  // The scheme dashboard sits at the scheme root, so it is active only on that exact address.
  return PM_VIU_SCHEME_PAGES.map((page) => ({ label: page.label, icon: page.icon, href: viuSchemeHref(scheme, page.path), exact: page.path === "" }));
}

export function SideNavBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    VKI:
      pathname.startsWith("/project-manager-workspace/vki") ||
      pathname.startsWith("/project-manager-workspace/applications/VKI") ||
      pathname.startsWith("/project-manager-workspace/reports/VKI"),
    // Detail pages (/applications/VIU/...) don't say which scheme they belong to, so only the VIU
    // group itself opens for them.
    VIU:
      pathname.startsWith(VIU_ROOT) ||
      pathname.startsWith("/project-manager-workspace/applications/VIU") ||
      pathname.startsWith("/project-manager-workspace/reports/VIU"),
    ...Object.fromEntries(PM_VIU_SCHEMES.map((scheme) => [scheme.slug, pathname.startsWith(`${VIU_ROOT}/${scheme.slug}`)])),
  }));
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const isDashboardActive = pathname === "/project-manager-workspace";
  const isVkiActive = VKI_GROUP.children.some((c) => pathname.startsWith(c.href));
  const isViuActive = pathname.startsWith(VIU_ROOT);

  let viuBody: ReactNode = null;
  if (expanded.VIU) {
    viuBody = (
      <div className="ml-3.5 mb-1 mt-0.5 flex flex-col gap-0.5 border-l-[1.5px] border-[#f0ded0] pl-2">
        {PM_VIU_SCHEMES.map((scheme) => (
          <div key={scheme.slug}>
            <GroupHeader
              nested
              label={scheme.label}
              icon={scheme.icon}
              isOpen={Boolean(expanded[scheme.slug])}
              isActive={pathname.startsWith(`${VIU_ROOT}/${scheme.slug}`)}
              onToggle={() => toggle(scheme.slug)}
            />
            {expanded[scheme.slug] && <NavLinks pathname={pathname} links={schemeLinks(scheme)} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[230px] flex-col gap-0.5 overflow-y-auto border-r border-[#f0ded0] bg-[#fffaf6] py-5 md:flex">
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

        <div>
          <GroupHeader label={VKI_GROUP.label} icon={VKI_GROUP.icon} isOpen={Boolean(expanded.VKI)} isActive={isVkiActive} onToggle={() => toggle("VKI")} />
          {expanded.VKI && <NavLinks pathname={pathname} links={VKI_GROUP.children} />}
        </div>

        <div>
          <GroupHeader label="VIU" icon="inventory" isOpen={Boolean(expanded.VIU)} isActive={isViuActive} onToggle={() => toggle("VIU")} />
          {viuBody}
        </div>
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
