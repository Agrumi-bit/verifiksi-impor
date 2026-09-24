"use client";

import { useRouter } from "next/navigation";

import { MaterialIcon } from "../material-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, useSession } from "@/lib/auth-client";

function initialsFromName(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TopNavBar() {
  const router = useRouter();
  const { data: session } = useSession();
  const initials = initialsFromName(session?.user.name);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 z-50 flex h-[60px] w-full items-center justify-end gap-4 border-b border-[#f0ded0] bg-[#fffaf6] px-6 md:pl-[244px]">
      <button type="button" className="text-[#a68f80]" aria-label="Notifications">
        <MaterialIcon name="notifications" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none hover:bg-[#fbeee5]">
          <div className="flex size-[34px] items-center justify-center rounded-full bg-[#e0662e] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden text-left text-xs leading-tight sm:block">
            <div className="font-bold text-[#2b2420]">{session?.user.name ?? "…"}</div>
            <div className="text-[#a68f80]">Customer Relationship</div>
          </div>
          <MaterialIcon name="expand_more" className="hidden text-base text-[#a68f80] sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="min-w-[220px] rounded-xl border border-[#f0ded0] bg-white p-1.5 shadow-lg ring-0"
        >
          <div className="flex items-center gap-3 border-b border-[#f0ded0] px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e0662e] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-[#2b2420]">{session?.user.name ?? "…"}</div>
              <div className="truncate text-[11.5px] text-[#a68f80]">{session?.user.email ?? ""}</div>
            </div>
          </div>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="mt-1 gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#ba1a1a] focus:bg-[#fbe2e0] focus:text-[#ba1a1a]"
          >
            <MaterialIcon name="logout" className="text-base" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
