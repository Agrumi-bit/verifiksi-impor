import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, createAccessControl } from "better-auth/plugins";

import { db } from "@/lib/db";
import { ROLES } from "@/modules/users/roles";

// The admin plugin validates every session's `role` value against this
// statement/role map (not just on admin.* calls) — every role string this
// app actually uses (src/modules/users/roles.ts) must have an entry here,
// or session lookups for that user 500 with "Invalid admin roles".
const adminStatement = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

const accessControl = createAccessControl(adminStatement);
const fullAccessRole = accessControl.newRole(adminStatement);
const noAccessRole = accessControl.newRole({ user: [], session: [] });

const authorizationRoles = Object.fromEntries(
  ROLES.map((role) => [role, role === "SUPER_ADMIN" || role === "ADMIN" ? fullAccessRole : noAccessRole]),
);

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  session: {
    // Every authenticated request — every tab, every save click — was hitting the Session
    // table on every single call just to resolve `getServerSession()`. This caches the
    // session+user in a short-lived signed cookie so most requests skip that DB round-trip
    // entirely. 60s keeps role/ban changes and impersonation start/end showing up quickly;
    // `disableCookieCache: true` on any individual getSession call still forces a fresh read
    // when that matters more than speed.
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  plugins: [
    admin({
      defaultRole: "SURVEYOR",
      ac: accessControl,
      roles: authorizationRoles,
      // Matches the actual role strings this app uses (src/modules/users/roles.ts) —
      // only these roles may call admin.* endpoints (setUserPassword, banUser, etc).
      adminRoles: ["SUPER_ADMIN", "ADMIN"],
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "SURVEYOR",
        // Role is assigned by an admin via User Management, never by the
        // user themselves during sign-up.
        input: false,
      },
      companyId: {
        type: "string",
        required: false,
        // Which Company this user represents in the Company Workspace.
        // Assigned by an admin, never set by the user during sign-up.
        input: false,
      },
    },
  },
});
