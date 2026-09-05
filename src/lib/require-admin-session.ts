import { requireSessionWithRole } from "./require-session";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export const requireAdminSession = requireSessionWithRole(ADMIN_ROLES);
