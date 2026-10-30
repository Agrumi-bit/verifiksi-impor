import { requireSessionWithRole } from "./require-session";

export const COMPLIANCE_ROLES = ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"];

export const requireComplianceSession = requireSessionWithRole(COMPLIANCE_ROLES);
