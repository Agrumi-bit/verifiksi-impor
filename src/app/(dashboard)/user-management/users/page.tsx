import type { Metadata } from "next";

import { UserTable } from "@/modules/users/components/user-table";

export const metadata: Metadata = {
  title: "User List — Verifikasi Impor",
};

export default function UsersPage() {
  return <UserTable />;
}
