"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiUKbliUtamaOption } from "../schema";

type ApiUKbliUtamaRow = ApiUKbliUtamaOption & { id: string; status: "ACTIVE" | "INACTIVE" };

/** Active rows of System Configuration → KBLI Utama API-U, shared by the Legal step and the wizard's step check. */
export function useApiUKbliUtamaOptions(enabled = true) {
  const { data } = useQuery({
    queryKey: ["master-data-api-u-kbli-utama", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/api-u-kbli-utama");
      if (!response.ok) throw new Error("Gagal memuat daftar KBLI Utama API-U");
      const json = (await response.json()) as { data: ApiUKbliUtamaRow[] };
      return json.data
        .filter((row) => row.status === "ACTIVE")
        .sort((a, b) => a.code.localeCompare(b.code) || b.version.localeCompare(a.version));
    },
    enabled,
  });
  return data ?? [];
}
