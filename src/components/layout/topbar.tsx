"use client";

import { useSyncExternalStore } from "react";
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

const subscribeNoop = () => () => {};

/** SSR-safe "has this component hydrated yet" check — the standard `useSyncExternalStore` idiom
 * for it (server/first-client snapshot `false`, every snapshot after `true`), not a `useState` +
 * `useEffect` pair: setting state synchronously inside an effect body is a lint error here
 * (react-hooks/set-state-in-effect) and causes an avoidable extra cascading render anyway. */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

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
  // `useSession` reads a client-side cookie cache that can already be resolved on the very first
  // client render, while the server (no browser cookie access in that sense) always renders the
  // `isPending` placeholder — a real server/client markup mismatch (the DropdownMenu button's
  // event handlers/aria attrs only exist on one side), not just a cosmetic flash. Rendering the
  // same placeholder through the first client render too (mounted stays false until after
  // hydration) keeps that first paint identical on both sides; the real session UI only swaps in
  // on the next render, once it's safe to differ from the server.
  const mounted = useHasMounted();

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

      {!mounted || isPending ? (
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
