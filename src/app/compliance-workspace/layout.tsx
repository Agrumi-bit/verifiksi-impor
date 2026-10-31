import { WorkspaceShell } from "@/modules/compliance-workspace/components/layout/workspace-shell";

export default function ComplianceWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
