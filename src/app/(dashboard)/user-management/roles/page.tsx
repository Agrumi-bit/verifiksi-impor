import type { Metadata } from "next";

import { RoleManagementPage } from "@/modules/users/components/role-management-page";

export const metadata: Metadata = {
  title: "Role Management — Verifikasi Impor",
};

export default function RolesPage() {
  return <RoleManagementPage />;
}
