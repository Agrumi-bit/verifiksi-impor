import { requireSessionWithRole } from "./require-session";

export const PROJECT_MANAGER_ROLES = ["PROJECT_MANAGER", "ADMIN", "SUPER_ADMIN"];

export const requireProjectManagerSession = requireSessionWithRole(PROJECT_MANAGER_ROLES);
