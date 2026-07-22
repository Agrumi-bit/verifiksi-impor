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
    <header className="fixed top-0 z-50 flex h-[60px] w-full items-center gap-7 border-b border-[#f0ded0] bg-[#fffaf6] px-6 md:pl-[244px]">
      <div className="flex flex-1 justify-center">
        <div className="flex w-[340px] items-center gap-2 rounded-lg bg-[#fbeee5] px-3.5 py-2 text-[12.5px] text-[#a68f80]">
          <MaterialIcon name="search" className="text-base" />
          Global search...
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className="text-[#a68f80]" aria-label="Notifications">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="text-[#a68f80]" aria-label="Settings">
          <MaterialIcon name="settings" />
        </button>
        <div className="flex size-[34px] items-center justify-center rounded-full bg-[#e0662e] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="hidden text-xs leading-tight sm:block">
          <div className="font-bold text-[#2b2420]">{session?.user.name ?? "…"}</div>
          <div className="text-[#a68f80]">
            {(session?.user as { role?: string } | undefined)?.role ?? "Surveyor"}
          </div>
        </div>
      </div>
    </header>
  );
}
