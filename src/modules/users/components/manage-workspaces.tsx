"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  Filter,
  Headset,
  Landmark,
  Pencil,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddUserDialog } from "./add-user-dialog";
import { EnterWorkspaceDialog } from "./enter-workspace-dialog";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "../roles";
import { ROLE_HOME } from "../workspace-routes";

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: Role | null;
  emailVerified: boolean;
  banned: boolean | null;
};

// Every non-admin role maps 1:1 to a workspace (workspace membership *is* the
// role, see workspace-routes.ts) — only the icon is presentation-only here.
const WORKSPACE_ROLES = ROLES.filter(
  (role) => role !== "SUPER_ADMIN" && role !== "ADMIN",
);

const WORKSPACE_ICONS: Record<Role, LucideIcon> = {
  SUPER_ADMIN: ShieldCheck,
  ADMIN: ShieldCheck,
  SURVEYOR: Wrench,
  VERIFIKATOR: ShieldCheck,
  TECHNICAL_ANALYST: Wrench,
  COMPLIANCE: ShieldCheck,
  PROJECT_MANAGER: Briefcase,
  PERUSAHAAN: Building2,
  CUSTOMER_RELATIONSHIP: Headset,
  GOVERNMENT: Landmark,
};

// ADMIN/SUPER_ADMIN aren't a workspace membership — they run the admin
// console itself (ROLE_HOME maps them to "/"), so the table's Workspace
// column shouldn't invent a "Super Admin Workspace" for them.
function workspaceLabelFor(role: Role): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "Admin Console";
  return `${ROLE_LABELS[role]} Workspace`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function ManageWorkspaces() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [showFilters, setShowFilters] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Gagal memuat data pengguna");
      const json = (await response.json()) as { data: UserRow[] };
      return json.data;
    },
  });

  const users = data ?? [];

  const usersByRole = useMemo(() => {
    const grouped = new Map<Role, UserRow[]>();
    for (const user of users) {
      if (!user.role) continue;
      grouped.set(user.role, [...(grouped.get(user.role) ?? []), user]);
    }
    return grouped;
  }, [users]);

  const userCountByRole = useMemo(() => {
    const counts = new Map<Role, number>();
    for (const [role, roleUsers] of usersByRole) {
      counts.set(role, roleUsers.length);
    }
    return counts;
  }, [usersByRole]);

  const activeUsers = users.filter((user) => !user.banned).length;
  const suspendedUsers = users.filter((user) => user.banned).length;
  const builtWorkspaceCount = WORKSPACE_ROLES.filter(
    (role) => ROLE_HOME[role] !== "/no-workspace",
  ).length;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter === "active" && user.banned) return false;
      if (statusFilter === "suspended" && !user.banned) return false;
      if (!query) return true;
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Manage Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh workspace pada platform verifikasi industri beserta pengguna dan
            penugasannya.
          </p>
        </div>
        <AddUserDialog className="bg-orange-600 text-white hover:bg-orange-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total Pengguna" value={users.length} icon={Users} isLoading={isLoading} />
        <SummaryTile
          label="Workspace Aktif"
          value={builtWorkspaceCount}
          icon={ShieldCheck}
          isLoading={isLoading}
        />
        <SummaryTile label="Pengguna Aktif" value={activeUsers} icon={UserCheck} isLoading={isLoading} />
        <SummaryTile
          label="Pengguna Suspended"
          value={suspendedUsers}
          icon={UserX}
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Workspaces</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSPACE_ROLES.map((role) => {
            const Icon = WORKSPACE_ICONS[role];
            const href = ROLE_HOME[role];
            const isBuilt = href !== "/no-workspace";
            return (
              <div
                key={role}
                className="flex flex-col gap-3 rounded-xl border border-orange-100 bg-background p-5"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={
                      isBuilt
                        ? "flex size-10 items-center justify-center rounded-[10px] bg-orange-100 text-orange-600"
                        : "flex size-10 items-center justify-center rounded-[10px] bg-muted text-muted-foreground"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <Badge
                    variant={isBuilt ? undefined : "outline"}
                    className={isBuilt ? "border-transparent bg-orange-100 text-orange-700" : undefined}
                  >
                    {isBuilt ? "Aktif" : "Belum Dibangun"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[15px] font-bold">{ROLE_LABELS[role]} Workspace</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
                <p className="border-t border-orange-100 pt-2.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {userCountByRole.get(role) ?? 0}
                  </span>{" "}
                  pengguna
                </p>
                {isBuilt ? (
                  <EnterWorkspaceDialog role={role} href={href} users={usersByRole.get(role) ?? []} />
                ) : (
                  <span className="mt-auto rounded-lg bg-muted/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                    Workspace belum tersedia
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-orange-100 bg-background p-[18px_22px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Filter className="size-[18px] text-muted-foreground" />
            <span className="text-sm font-bold">Filter Pengguna</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-orange-100 px-3.5 py-1.5 text-xs font-medium hover:bg-orange-50"
          >
            {showFilters ? "Sembunyikan" : "Tampilkan"}
            {showFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
        {showFilters && (
          <div className="grid gap-4 border-t border-orange-100/70 pt-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workspace-user-search">Cari Pengguna</Label>
              <Input
                id="workspace-user-search"
                placeholder="Nama atau email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Workspace</Label>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as Role | "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value && value !== "all"
                        ? ROLE_LABELS[value as Role]
                        : "Semua Workspace"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Workspace</SelectItem>
                  {WORKSPACE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | "active" | "suspended")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value === "active"
                        ? "Aktif"
                        : value === "suspended"
                          ? "Suspended"
                          : "Semua Status"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredUsers.length} pengguna ditemukan
      </p>

      <div className="rounded-lg border border-orange-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-50/60 hover:bg-orange-50/60">
              <TableHead className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Pengguna
              </TableHead>
              <TableHead className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Workspace
              </TableHead>
              <TableHead className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Role
              </TableHead>
              <TableHead className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Status
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Tidak ada pengguna yang cocok dengan filter.
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-orange-100/70">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.role ? workspaceLabelFor(user.role) : "—"}</TableCell>
                <TableCell>{user.role ? ROLE_LABELS[user.role] : "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.banned ? "destructive" : undefined}
                    className={!user.banned ? "border-transparent bg-orange-100 text-orange-700" : undefined}
                  >
                    {user.banned ? "Suspended" : "Aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/user-management/users/${user.id}`}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-orange-100 hover:text-orange-700"
                  >
                    <Pencil className="size-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-background p-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold">{isLoading ? "—" : value}</p>
      </div>
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
        <Icon className="size-[19px]" />
      </span>
    </div>
  );
}
