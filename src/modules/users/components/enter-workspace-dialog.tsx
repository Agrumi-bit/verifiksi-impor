"use client";

import { useState } from "react";
import { ExternalLink, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { ROLE_LABELS, type Role } from "../roles";

type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  banned: boolean | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function EnterWorkspaceDialog({
  role,
  href,
  users,
}: {
  role: Role;
  href: string;
  users: WorkspaceUser[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);

  const selectableUsers = users.filter((user) => !user.banned);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSelectedUserId(null);
  }

  async function handleEnterAsUser() {
    if (!selectedUserId) return;
    setIsEntering(true);
    const { error } = await authClient.admin.impersonateUser({ userId: selectedUserId });
    if (error) {
      toast.error(error.message ?? "Gagal masuk sebagai pengguna ini");
      setIsEntering(false);
      return;
    }
    // Full reload (not router.push) so every server component along the
    // workspace route re-reads the freshly-set impersonation session cookie.
    window.location.href = href;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-center text-xs font-bold text-orange-700 hover:bg-orange-100"
          >
            <ExternalLink className="size-3.5" />
            Buka Workspace
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Masuk ke {ROLE_LABELS[role]} Workspace</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pilih pengguna untuk masuk sebagai pengguna tersebut (impersonasi), sehingga Anda
          melihat workspace persis seperti yang dilihat pengguna itu.
        </p>

        {selectableUsers.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Belum ada pengguna aktif di workspace ini.
          </p>
        ) : (
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {selectableUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={
                  selectedUserId === user.id
                    ? "flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 p-2.5 text-left"
                    : "flex items-center gap-3 rounded-lg border border-transparent p-2.5 text-left hover:bg-muted/50"
                }
              >
                <Avatar size="sm">
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <a href={href} className={buttonVariants({ variant: "outline" })}>
            Masuk sebagai Admin
          </a>
          <Button
            type="button"
            disabled={!selectedUserId || isEntering}
            onClick={handleEnterAsUser}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            <LogIn className="size-4" />
            {isEntering ? "Masuk..." : "Masuk sebagai Pengguna"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
