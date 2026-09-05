import { requireSessionWithRole } from "./require-session";

export const VERIFIKATOR_ROLES = ["VERIFIKATOR", "ADMIN", "SUPER_ADMIN"];

export const requireVerifikatorSession = requireSessionWithRole(VERIFIKATOR_ROLES);
