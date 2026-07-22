import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  companyId?: string;
};

export async function getServerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session
    ? { ...session, user: session.user as SessionUser }
    : null;
}
