import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
