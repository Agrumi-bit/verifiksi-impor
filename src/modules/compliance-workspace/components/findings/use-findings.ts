"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { FindingKind } from "../../consolidation";
import type { FindingFollowUp, FindingRow } from "../../server/findings";
import { QUERY_KEY as CASES_QUERY_KEY } from "../case-list/use-case-list";

export type { FindingFollowUp, FindingRow };

const FINDINGS_KEY = ["compliance-workspace", "findings"] as const;

type FindingsResponse = { findings: FindingRow[]; counts: Record<FindingKind, number>; pics: { id: string; name: string }[] };

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok || json.data === undefined) throw new Error(json.error ?? fallback);
  return json.data;
}

export function useFindings() {
  return useQuery({
    queryKey: FINDINGS_KEY,
    queryFn: async () => readJson<FindingsResponse>(await fetch("/api/compliance-workspace/findings"), "Gagal memuat temuan."),
  });
}

export function useFinding(id: string | null) {
  return useQuery({
    queryKey: [...FINDINGS_KEY, id],
    enabled: id !== null,
    queryFn: async () =>
      readJson<FindingRow & { followUps: FindingFollowUp[] }>(await fetch(`/api/compliance-workspace/findings/${id}`), "Gagal memuat temuan."),
  });
}

/** Refreshes the findings and the Daftar Permohonan (its categories and issue counts depend on them). */
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: FINDINGS_KEY }), queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })]);
}

export type NewFinding = {
  applicationId: string;
  requirementKey: string;
  kind: "OPEN" | "KLARIFIKASI" | "CONFLICT";
  severity: "RENDAH" | "SEDANG" | "TINGGI";
  sourceWorkspace: string;
  title: string;
  evidenceA?: string;
  evidenceB?: string;
  ownerId?: string | null;
};

export function useCreateFinding() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: NewFinding) =>
      readJson<{ id: string; issueNumber: string }>(
        await fetch("/api/compliance-workspace/findings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        "Gagal mencatat temuan.",
      ),
    onSuccess: (data) => {
      toast.success(`Temuan ${data.issueNumber} dicatat.`);
      return invalidate();
    },
  });
}

export type FollowUpBody = { action: "follow-up"; kind: FindingKind; ownerId: string | null; note: string } | { action: "clarify" };

export function useFollowUp(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: FollowUpBody) =>
      readJson<{ kind: FindingKind; text: string }>(
        await fetch(`/api/compliance-workspace/findings/${id}/follow-ups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        "Gagal menyimpan tindak lanjut.",
      ),
    onSuccess: () => invalidate(),
  });
}
