"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { ROLES, ROLE_LABELS, type Role } from "../roles";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  emailVerified: boolean;
};

export function UserTable() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Gagal memuat data pengguna");
      const json = (await response.json()) as { data: UserRow[] };
      return json.data;
    },
  });

  async function handleRoleChange(userId: string, role: Role) {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      toast.error("Gagal mengubah role");
      return;
    }
    toast.success("Role berhasil diperbarui.");
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">User List</h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh pengguna yang terdaftar dalam sistem.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-destructive">
                  Gagal memuat data. Pastikan database sudah terhubung.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Belum ada pengguna terdaftar.
                </TableCell>
              </TableRow>
            )}
            {data?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role ?? ""}
                    onValueChange={(value) => handleRoleChange(user.id, value as Role)}
                  >
                    <SelectTrigger size="sm" className="w-48">
                      <SelectValue>
                        {(value: string | null) =>
                          (value && ROLE_LABELS[value as Role]) || "—"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
