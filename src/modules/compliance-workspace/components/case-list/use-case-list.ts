"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CasePage, QuickChip, SortKey } from "../../case-list";
import type { WorkspaceKey, WorkspaceState } from "../../workspace-status";

export type CaseListResponse = CasePage & {
  counts: Record<QuickChip, number> & { ALL: number };
  pics: { id: string; name: string }[];
};

export type CaseFilters = {
  q: string;
  chip: QuickChip | "";
  lastWorkspace: WorkspaceKey | "";
  pic: string;
  from: string;
  to: string;
  wsSV: WorkspaceState | "";
  wsVF: WorkspaceState | "";
  wsTA: WorkspaceState | "";
  wsPM: WorkspaceState | "";
  openIssue: "ya" | "tidak" | "";
  conflict: "ya" | "tidak" | "";
  lhviu: "Terbit" | "Belum Terbit" | "";
  score: "100" | "90" | "75" | "lt75" | "";
};

export const EMPTY_FILTERS: CaseFilters = {
  q: "",
  chip: "",
  lastWorkspace: "",
  pic: "",
  from: "",
  to: "",
  wsSV: "",
  wsVF: "",
  wsTA: "",
  wsPM: "",
  openIssue: "",
  conflict: "",
  lhviu: "",
  score: "",
};

export const ADVANCED_KEYS = ["wsSV", "wsVF", "wsTA", "wsPM", "openIssue", "conflict", "lhviu", "score"] as const;
export const QUERY_KEY = ["compliance-workspace", "applications"] as const;

export function toSearchParams(filters: CaseFilters, extra: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key === "pic" ? "pic" : key, value);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params;
}

async function fetchCases(params: URLSearchParams): Promise<CaseListResponse> {
  const response = await fetch(`/api/compliance-workspace/applications?${params}`);
  if (!response.ok) throw new Error("Gagal memuat daftar permohonan.");
  return ((await response.json()) as { data: CaseListResponse }).data;
}

export function useCaseList() {
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("updated");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const params = toSearchParams(filters, { sort, dir, page: String(page), pageSize: String(pageSize) });
  const query = useQuery({
    queryKey: [...QUERY_KEY, params.toString()],
    queryFn: () => fetchCases(params),
    placeholderData: keepPreviousData,
  });

  function updateFilters(patch: Partial<CaseFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function sortBy(key: SortKey) {
    setDir((current) => (sort === key ? (current === "asc" ? "desc" : "asc") : key === "number" ? "asc" : "desc"));
    setSort(key);
    setPage(1);
  }

  /** Every row matching the current filters (for Export). */
  async function fetchAllFiltered(): Promise<CaseListResponse> {
    return fetchCases(toSearchParams(filters, { sort, dir, pageSize: "all" }));
  }

  return {
    filters,
    updateFilters,
    resetFilters: () => {
      setFilters(EMPTY_FILTERS);
      setPage(1);
    },
    sort,
    dir,
    sortBy,
    setSort: (key: SortKey) => {
      setSort(key);
      setPage(1);
    },
    toggleDir: () => setDir((current) => (current === "asc" ? "desc" : "asc")),
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    query,
    fetchAllFiltered,
  };
}

export function useUpdateCompliance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { applicationIds: string[]; picUserId?: string | null; reviewFlag?: boolean }) => {
      const response = await fetch("/api/compliance-workspace/applications/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; data?: { updated: number } };
      if (!response.ok) throw new Error(json.error ?? "Gagal menyimpan perubahan.");
      return json.data?.updated ?? 0;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error: Error) => toast.error(error.message),
  });
}
