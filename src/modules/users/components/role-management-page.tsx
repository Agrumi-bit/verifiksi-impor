"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from "../roles";

type UserRow = { role: Role | null };

export function RoleManagementPage() {
  const { data } = useQuery({
    queryKey: ["users", "role-counts"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Gagal memuat data pengguna");
      const json = (await response.json()) as { data: UserRow[] };
      return json.data;
    },
  });

  const counts = new Map<Role, number>();
  for (const user of data ?? []) {
    if (!user.role) continue;
    counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-10">
      <div>
        <h1 className="text-lg font-semibold">Role Management</h1>
        <p className="text-sm text-muted-foreground">
          Daftar role yang tersedia di platform. Role ditetapkan saat menambahkan
          pengguna di User List.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ROLES.map((role) => (
          <div
            key={role}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
          >
            <div>
              <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
            <Badge variant="secondary">{counts.get(role) ?? 0} pengguna</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
