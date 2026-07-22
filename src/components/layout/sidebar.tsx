"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/use-ui-store";
import { NAV_SECTIONS } from "@/modules/dashboard/nav-config";
import { COMPANY_WORKSPACE_NAV } from "@/modules/company-workspace/nav-config";
import { SURVEYOR_WORKSPACE_NAV } from "@/modules/surveyor-workspace/nav-config";

export type NavItem = {
  label: string;
  href?: string;
};

export type NavSection = {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavItem[];
};

// Nav configs embed Lucide icon *components* (functions), which cannot cross
// the Server -> Client Component prop boundary. Layouts (Server Components)
// pass a plain string `variant` instead, and the config is looked up here,
// inside the client bundle, where function values are safe to hold.
const NAV_BY_VARIANT: Record<"admin" | "company" | "surveyor", NavSection[]> = {
  admin: NAV_SECTIONS,
  company: COMPANY_WORKSPACE_NAV,
  surveyor: SURVEYOR_WORKSPACE_NAV,
};

type Props = {
  variant: "admin" | "company" | "surveyor";
  brandTitle: string;
  brandSubtitle: string;
};

function sectionContainsPath(section: NavSection, pathname: string): boolean {
  if (section.href === pathname) return true;
  return section.children?.some((child) => child.href === pathname) ?? false;
}

export function Sidebar({ variant, brandTitle, brandSubtitle }: Props) {
  const sections = NAV_BY_VARIANT[variant];
  const pathname = usePathname();
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const [openSections, setOpenSections] = useState<string[]>(() =>
    sections
      .filter((section) => sectionContainsPath(section, pathname))
      .map((section) => section.label),
  );

  function toggleSection(label: string) {
    setOpenSections((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  if (!isSidebarOpen) return null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">{brandTitle}</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {brandSubtitle}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => {
          const Icon = section.icon;

          if (!section.children) {
            const isActive = pathname === section.href;
            return (
              <Link
                key={section.label}
                href={section.href ?? "#"}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {section.label}
              </Link>
            );
          }

          const isOpen = openSections.includes(section.label);

          return (
            <div key={section.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/60"
              >
                <Icon className="size-4" />
                <span className="flex-1">{section.label}</span>
                <ChevronDown
                  className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-4">
                  {section.children.map((child) => {
                    const isActive = pathname === child.href;
                    if (!child.href) {
                      return (
                        <span
                          key={child.label}
                          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground/50"
                          title="Segera hadir"
                        >
                          {child.label}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
