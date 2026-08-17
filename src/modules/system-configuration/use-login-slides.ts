import { useQuery } from "@tanstack/react-query";

import type { LoginSlideStatusValue } from "./login-slides";

export type AdminLoginSlide = {
  id: string;
  imagePath: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  order: number;
  status: LoginSlideStatusValue;
  startDate: string | null;
  endDate: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useAdminLoginSlides() {
  return useQuery({
    queryKey: ["system-configuration", "login-slides", "admin"],
    queryFn: async () => {
      const response = await fetch("/api/system-configuration/login-slides/admin");
      if (!response.ok) throw new Error("Gagal memuat daftar slide");
      const json = (await response.json()) as { data: AdminLoginSlide[] };
      return json.data;
    },
  });
}

export type PublicLoginSlide = {
  id: string;
  imagePath: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
};

export function loginSlideImageHref(path: string): string {
  return `/api/system-configuration/login-slides/image?path=${encodeURIComponent(path)}`;
}

/** Only currently-visible slides (ACTIVE + inside schedule, if any) — public endpoint, safe to call before login. */
export function usePublicLoginSlides() {
  return useQuery({
    queryKey: ["system-configuration", "login-slides", "public"],
    queryFn: async () => {
      const response = await fetch("/api/system-configuration/login-slides");
      if (!response.ok) throw new Error("Gagal memuat slide login");
      const json = (await response.json()) as { data: PublicLoginSlide[] };
      return json.data;
    },
    staleTime: 60 * 1000,
  });
}
