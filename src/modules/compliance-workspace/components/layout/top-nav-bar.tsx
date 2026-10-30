"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, useSession } from "@/lib/auth-client";
import { ROLE_LABELS, type Role } from "@/modules/users/roles";
import { COMPLIANCE_HOME, activeNavItem } from "../../navigation";

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
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const initials = initialsFromName(session?.user.name);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const roleLabel = role ? (ROLE_LABELS[role as Role] ?? role) : "Compliance";
  const crumb = pathname === `${COMPLIANCE_HOME}/account` ? "Akun" : (activeNavItem(pathname)?.label ?? "Dashboard");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 z-30 flex h-[60px] w-full items-center gap-4 border-b border-[#E5EAF0] bg-white px-6 md:pl-[256px]">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-[#64748B]">
        <span>Compliance</span>
        <span aria-hidden>/</span>
        <span className="truncate font-semibold text-[#10233F]">{crumb}</span>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none hover:bg-[#F5F7FA] focus-visible:ring-2 focus-visible:ring-[#1677FF]">
          <div className="flex size-[34px] items-center justify-center rounded-full bg-[#1677FF] text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="hidden text-left text-xs leading-tight sm:block">
            <div className="font-semibold text-[#10233F]">{session?.user.name ?? "…"}</div>
            <div className="text-[#64748B]">{roleLabel}</div>
          </div>
          <ChevronDown className="hidden size-4 text-[#64748B] sm:block" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="min-w-[240px] rounded-xl border border-[#E5EAF0] bg-white p-1.5 shadow-lg ring-0">
          <div className="border-b border-[#E5EAF0] px-3 py-3">
            <div className="truncate text-[13px] font-semibold text-[#10233F]">{session?.user.name ?? "…"}</div>
            <div className="truncate text-[11.5px] text-[#64748B]">{session?.user.email ?? ""}</div>
          </div>
          <DropdownMenuItem
            render={<Link href={`${COMPLIANCE_HOME}/account`} />}
            className="mt-1 gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-[#10233F] focus:bg-[#F5F7FA] focus:text-[#10233F]"
          >
            <UserRound className="size-4 text-[#64748B]" aria-hidden />
            Akun
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-[#E5EAF0]" />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-[#DC2626] focus:bg-[#FEF2F2] focus:text-[#DC2626]"
          >
            <LogOut className="size-4" aria-hidden />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
