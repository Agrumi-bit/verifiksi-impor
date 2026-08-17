"use client";

import { useRouter } from "next/navigation";

import { authClient, useSession } from "@/lib/auth-client";
import { ROLE_LABELS, type Role } from "@/modules/users/roles";

/** Landing page for roles with no workspace built yet (COMPLIANCE, GOVERNMENT) — honest "not built" state instead of silently falling into the admin area. */
export default function NoWorkspacePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const roleLabel = role ? (ROLE_LABELS[role as Role] ?? role) : "—";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/20 p-6 text-center">
      <h1 className="text-lg font-semibold">Workspace Belum Tersedia</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Belum ada workspace untuk role <span className="font-semibold">{roleLabel}</span>. Hubungi administrator sistem.
      </p>
      <button type="button" onClick={handleSignOut} className="mt-2 text-sm font-medium text-destructive underline">
        Sign Out
      </button>
    </div>
  );
}
