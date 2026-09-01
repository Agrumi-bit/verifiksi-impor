"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [isExiting, setIsExiting] = useState(false);

  const impersonatedBy = session?.session
    ? (session.session as { impersonatedBy?: string | null }).impersonatedBy
    : null;

  if (!impersonatedBy) return null;

  async function handleStopImpersonating() {
    setIsExiting(true);
    await authClient.admin.stopImpersonating();
    // Full reload — the admin's own session cookie is now active and every
    // server component down the tree (nav, role guards) needs to re-read it.
    window.location.href = "/user-management/workspaces";
  }

  return (
    // Fixed + top-most z-index: every workspace shell (surveyor, verifikator, ...)
    // renders its own `position: fixed` top bar starting at inset-x-0 top-0, which
    // would otherwise paint over a banner sitting in normal document flow. Floating
    // this on top, instead of trying to reserve space in ~10 independent layouts,
    // keeps the "you're impersonating" ribbon reliably visible everywhere.
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-orange-600 px-4 py-2 text-sm text-white shadow-md">
      <UserCog className="size-4" />
      <span>
        Anda sedang masuk sebagai <span className="font-semibold">{session?.user?.name}</span>{" "}
        (impersonasi admin)
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/40 bg-transparent text-white hover:bg-white/10"
        disabled={isExiting}
        onClick={handleStopImpersonating}
      >
        {isExiting ? "Kembali..." : "Kembali ke Admin"}
      </Button>
    </div>
  );
}
