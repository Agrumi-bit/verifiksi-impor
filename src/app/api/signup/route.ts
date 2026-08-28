import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { signupSchema } from "@/modules/auth/schema";

/**
 * Public self-registration — unlike `POST /api/users` (admin-only, any role), this endpoint
 * requires no session and always creates the account as "PERUSAHAAN". `role`/`companyId` are
 * `input: false` on the Better Auth user schema (see src/lib/auth.ts), so we go through
 * `auth.api.createUser` server-side the same way the admin route does, just with the role
 * hardcoded instead of admin-chosen — the client can never choose a role. Deliberately called
 * WITHOUT `headers`: better-auth's admin plugin treats a headers-less server call as a trusted
 * internal call and skips its own session/permission check entirely (it only throws UNAUTHORIZED
 * when headers/request are present but resolve to no session) — passing headers here would make
 * this 401 for every anonymous visitor, which is the one thing a public sign-up endpoint can't do.
 * `companyId` stays null; the account is linked to a real Company afterward via onboarding.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const result = await auth.api.createUser({
      body: { name, email, password, role: "PERUSAHAAN" },
    });
    return NextResponse.json(
      { data: { id: result.user.id, email: result.user.email } },
      { status: 201 },
    );
  } catch (signUpError) {
    return NextResponse.json(
      {
        error:
          signUpError instanceof Error
            ? signUpError.message
            : "Gagal membuat akun. Coba lagi.",
      },
      { status: 400 },
    );
  }
}
