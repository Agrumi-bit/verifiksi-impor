"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { useUiStore } from "@/stores/use-ui-store";

function initialsFromName(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const router = useRouter();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const { data: session, isPending } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu className="size-4" />
      </Button>

      {isPending ? (
        <span className="text-xs text-muted-foreground">Memuat sesi...</span>
      ) : session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/60">
            <Avatar className="size-7">
              <AvatarFallback>{initialsFromName(session.user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{session.user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {session.user.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
