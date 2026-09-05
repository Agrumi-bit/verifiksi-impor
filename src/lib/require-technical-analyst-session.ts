import { requireSessionWithRole } from "./require-session";

export const TECHNICAL_ANALYST_ROLES = ["TECHNICAL_ANALYST", "ADMIN", "SUPER_ADMIN"];

export const requireTechnicalAnalystSession = requireSessionWithRole(TECHNICAL_ANALYST_ROLES);
