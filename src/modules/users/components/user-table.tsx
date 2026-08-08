"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddUserDialog } from "./add-user-dialog";
import { ROLE_LABELS, type Role } from "../roles";

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: Role | null;
  emailVerified: boolean;
  banned: boolean | null;
};

export function UserTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Gagal memuat data pengguna");
      const json = (await response.json()) as { data: UserRow[] };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">User List</h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh pengguna yang terdaftar dalam sistem. Klik baris untuk melihat detail.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
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
            {!isLoading && !isError && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada pengguna terdaftar.
                </TableCell>
              </TableRow>
            )}
            {data?.map((user) => (
              <TableRow key={user.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell className="p-0">
                  <Link href={`/user-management/users/${user.id}`} className="block px-4 py-2 font-medium">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/user-management/users/${user.id}`} className="block px-4 py-2">
                    {user.username || "—"}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/user-management/users/${user.id}`} className="block px-4 py-2">
                    {user.email}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/user-management/users/${user.id}`} className="block px-4 py-2">
                    {(user.role && ROLE_LABELS[user.role]) || "—"}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/user-management/users/${user.id}`} className="block px-4 py-2">
                    <Badge variant={user.banned ? "destructive" : "default"}>
                      {user.banned ? "Suspended" : "Aktif"}
                    </Badge>
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
