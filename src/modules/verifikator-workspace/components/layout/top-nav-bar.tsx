"use client";

import { MaterialIcon } from "../material-icon";
import { useSession } from "@/lib/auth-client";

export function TopNavBar() {
  const { data: session } = useSession();
  const initials = (session?.user.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 z-50 flex h-[60px] w-full items-center gap-7 border-b border-[#e4e7f2] bg-[#fcfcff] px-6 md:pl-[244px]">
      <div className="flex flex-1 justify-center">
        <div className="flex w-[340px] items-center gap-2 rounded-lg bg-[#f0f2fa] px-3.5 py-2 text-[12.5px] text-[#8891ab]">
          <MaterialIcon name="search" className="text-base" />
          Search assignment, company, or application...
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className="text-[#8891ab]" aria-label="Notifications">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="text-[#8891ab]" aria-label="Settings">
          <MaterialIcon name="settings" />
        </button>
        <div className="flex size-[34px] items-center justify-center rounded-full bg-[#3454d1] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="hidden text-xs leading-tight sm:block">
          <div className="font-bold text-[#1f2437]">{session?.user.name ?? "…"}</div>
          <div className="text-[#8891ab]">
            {(session?.user as { role?: string } | undefined)?.role ?? "Verifikator"}
          </div>
        </div>
      </div>
    </header>
  );
}
