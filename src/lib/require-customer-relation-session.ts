import { requireSessionWithRole } from "./require-session";

export const CUSTOMER_RELATION_ROLES = ["CUSTOMER_RELATIONSHIP", "ADMIN", "SUPER_ADMIN"];

export const requireCustomerRelationSession = requireSessionWithRole(CUSTOMER_RELATION_ROLES);
