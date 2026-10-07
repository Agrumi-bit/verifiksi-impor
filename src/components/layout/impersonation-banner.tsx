"use client";

import { useEffect, useState } from "react";
import { Minus, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";

const COLLAPSED_STORAGE_KEY = "impersonation-banner-collapsed";
const BOTTOM_BAR_SELECTOR = "[data-bottom-action-bar]";
const BASE_OFFSET_PX = 16;

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.sessionStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // sessionStorage unavailable (private mode, blocked) — the choice just won't persist.
  }
}

/** Height of the page's own bottom action bar (a `[data-bottom-action-bar]` element), 0 when none. */
function measureBottomBar(): number {
  const bar = document.querySelector<HTMLElement>(BOTTOM_BAR_SELECTOR);
  if (!bar) return 0;
  const rect = bar.getBoundingClientRect();
  // Only a bar actually pinned to the bottom of the viewport can be covered by the banner.
  return rect.height > 0 && rect.bottom >= window.innerHeight - 1 ? rect.height : 0;
}

/** Keeps the banner clear of a sticky/fixed bottom action bar, whenever one is on the page. */
function useBottomBarOffset(enabled: boolean): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const update = () => setOffset(measureBottomBar());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [enabled]);

  return offset;
}

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [isExiting, setIsExiting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const impersonatedBy = session?.session
    ? (session.session as { impersonatedBy?: string | null }).impersonatedBy
    : null;
  const isImpersonating = Boolean(impersonatedBy);
  const bottomBarHeight = useBottomBarOffset(isImpersonating);

  if (!isImpersonating) return null;

  function toggleCollapsed(next: boolean) {
    setIsCollapsed(next);
    writeCollapsed(next);
  }

  async function handleStopImpersonating() {
    setIsExiting(true);
    await authClient.admin.stopImpersonating();
    // Full reload — the admin's own session cookie is now active and every
    // server component down the tree (nav, role guards) needs to re-read it.
    window.location.href = "/user-management/workspaces";
  }

  const bottom = BASE_OFFSET_PX + bottomBarHeight;

  // A small floating card in the bottom-right corner: the workspace shells all paint their own
  // top bars (fixed/sticky at top-0), so anything pinned to the top covers their buttons. Bottom
  // action bars are measured above (`data-bottom-action-bar`) and the card rides on top of them.
  if (isCollapsed) {
    return (
      <div className="fixed right-4 z-[100] print:hidden" style={{ bottom }} aria-live="polite">
        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label={`Mode impersonasi: ${session?.user?.name ?? ""}. Buka`}
          title="Mode impersonasi — klik untuk membuka"
          className="flex size-11 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          <UserCog className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-3 z-[100] flex flex-col gap-2 rounded-xl bg-orange-600 px-3.5 py-3 text-sm text-white shadow-lg sm:inset-x-auto sm:right-4 sm:w-[360px] sm:max-w-[calc(100vw-2rem)] print:hidden"
      style={{ bottom }}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <UserCog className="mt-0.5 size-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          Mode impersonasi: <span className="font-semibold break-words">{session?.user?.name}</span>
        </p>
        <button
          type="button"
          onClick={() => toggleCollapsed(true)}
          aria-label="Perkecil banner impersonasi"
          title="Perkecil"
          className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
        >
          <Minus className="size-4" />
        </button>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
        disabled={isExiting}
        onClick={handleStopImpersonating}
      >
        {isExiting ? "Kembali..." : "Kembali ke Admin"}
      </Button>
    </div>
  );
}
