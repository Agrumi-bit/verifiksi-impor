"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { COMPLIANCE_NAV, activeNavItem } from "../../navigation";

export function SideNavBar() {
  const pathname = usePathname() ?? "";
  const active = activeNavItem(pathname);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[232px] flex-col bg-[#102A43] text-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#1677FF]">
          <ShieldCheck className="size-4.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight">Compliance Workspace</div>
          <div className="text-[11px] text-white/55">VIU – Barang Konsumsi</div>
        </div>
      </div>

      <nav aria-label="Compliance Workspace" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        {COMPLIANCE_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active?.href === item.href;
          if (!item.available) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/35"
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-white/50">Segera</span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1677FF]",
                isActive ? "bg-[#1677FF] font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-snug text-white/45">
        Monitor · Konsolidasi · Trace · Review · Audit. Tidak mengubah data workspace lain.
      </p>
    </aside>
  );
}
