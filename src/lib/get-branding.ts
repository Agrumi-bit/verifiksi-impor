import { db } from "@/lib/db";

const BRANDING_ID = "branding";

/** Schema defaults, mirrored here so branding chrome (root layout, dashboard shell) still
 * renders sensibly when the DB is unreachable — e.g. during the Docker image build, which has
 * no DATABASE_URL, or a transient outage. This call sits in every page's render path, so it
 * must never take the whole app down. */
const FALLBACK_BRANDING = {
  id: BRANDING_ID,
  appName: "VKI & VIU Platform",
  appSubtitle: "Sistem Verifikasi Kemampuan Industri & Verifikasi Importir Umum",
  sidebarBrandTitle: "VKI & VIU",
  sidebarBrandSubtitle: "Admin Portal",
  logoPath: null as string | null,
  primaryColor: "#e0662e",
  primaryColorForeground: "#ffffff",
  updatedAt: new Date(),
};

/** Server-side read of the singleton branding row, creating the default row on first use. Shared by the root layout, the admin dashboard shell, and the public branding API route so all three never drift. */
export async function getBrandingSettings() {
  try {
    return await db.brandingSettings.upsert({
      where: { id: BRANDING_ID },
      update: {},
      create: { id: BRANDING_ID },
    });
  } catch (error) {
    console.error("getBrandingSettings: DB unreachable, using fallback branding", error);
    return FALLBACK_BRANDING;
  }
}

export { BRANDING_ID };
