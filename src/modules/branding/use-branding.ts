import { useQuery } from "@tanstack/react-query";

export type BrandingData = {
  appName: string;
  appSubtitle: string;
  sidebarBrandTitle: string;
  sidebarBrandSubtitle: string;
  logoPath: string | null;
  /** Separate letterhead mark for generated reports — see `reportLogoPath` on `BrandingSettings`. */
  reportLogoPath: string | null;
  primaryColor: string;
  primaryColorForeground: string;
};

/** Public, narrow endpoint that serves only the current branding logo — safe to use unauthenticated (e.g. on the login page). */
export const BRANDING_LOGO_URL = "/api/system-configuration/branding/logo";
/** Public, narrow endpoint that serves only the current report letterhead logo. */
export const BRANDING_REPORT_LOGO_URL = "/api/system-configuration/branding/report-logo";

/** Admin-editable app identity — read on the login page and (as a client-side fallback) anywhere else that needs it without a server-rendered value already in hand. */
export function useBranding() {
  return useQuery({
    queryKey: ["system-configuration", "branding"],
    queryFn: async () => {
      const response = await fetch("/api/system-configuration/branding");
      if (!response.ok) throw new Error("Gagal memuat branding");
      const json = (await response.json()) as { data: BrandingData };
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
