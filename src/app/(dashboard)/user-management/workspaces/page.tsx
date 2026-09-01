import type { Metadata } from "next";

import { ManageWorkspaces } from "@/modules/users/components/manage-workspaces";

export const metadata: Metadata = {
  title: "Manage Workspaces — Verifikasi Impor",
};

export default function ManageWorkspacesPage() {
  return <ManageWorkspaces />;
}
