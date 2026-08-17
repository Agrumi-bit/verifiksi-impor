import { db } from "@/lib/db";

const BRANDING_ID = "branding";

/** Server-side read of the singleton branding row, creating the default row on first use. Shared by the root layout, the admin dashboard shell, and the public branding API route so all three never drift. */
export async function getBrandingSettings() {
  return db.brandingSettings.upsert({
    where: { id: BRANDING_ID },
    update: {},
    create: { id: BRANDING_ID },
  });
}

export { BRANDING_ID };
