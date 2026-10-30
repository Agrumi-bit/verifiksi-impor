"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { FindingKind } from "../../consolidation";
import { FINDING_KINDS, FINDING_KIND_LABELS, FINDING_SEVERITY_LABELS, validateFollowUp } from "../../finding-rules";
import { COMPLIANCE_HOME } from "../../navigation";
import { REQUIREMENTS, stepOfRequirement } from "../../requirements";
import { WORKSPACE_LABELS, type WorkspaceKey } from "../../workspace-status";
import { Pill } from "../case-list/badges";
import { INPUT_CLASS } from "../case-list/case-filters";
import { formatDateTime } from "../case-list/format";
import { useFinding, useFollowUp, type FindingRow } from "./use-findings";

const REQUIREMENT_LABELS = Object.fromEntries(REQUIREMENTS.map((requirement) => [requirement.key, requirement.label])) as Record<string, string>;
export const KIND_TONE: Record<FindingKind, "red" | "orange" | "green"> = { OPEN: "red", CONFLICT: "red", KLARIFIKASI: "orange", RESOLVED: "green" };

function sourceLabel(key: string): string {
  return WORKSPACE_LABELS[key as WorkspaceKey] ?? key;
}

function FollowUpForm({ finding, pics }: { finding: FindingRow; pics: { id: string; name: string }[] }) {
  const [kind, setKind] = useState<FindingKind>(finding.kind);
  const [ownerId, setOwnerId] = useState<string>(finding.ownerId ?? "");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const followUp = useFollowUp(finding.id);

  async function save() {
    // Same rule as the server, checked first so the message shows right away.
    const check = validateFollowUp({
      current: { kind: finding.kind, ownerId: finding.ownerId, ownerName: finding.ownerName },
      next: { kind, ownerId: ownerId || null, ownerName: pics.find((pic) => pic.id === ownerId)?.name ?? null },
      note,
    });
    if (!check.ok) {
      setFormError(check.error);
      return;
    }
    try {
      await followUp.mutateAsync({ action: "follow-up", kind, ownerId: ownerId || null, note });
      setNote("");
      setFormError(null);
      toast.success(`Tindak lanjut ${finding.issueNumber} disimpan.`);
    } catch (cause) {
      setFormError((cause as Error).message);
    }
  }

  async function clarify() {
    try {
      const result = await followUp.mutateAsync({ action: "clarify" });
      setKind(result.kind);
      setFormError(null);
      toast.success(result.text);
    } catch (cause) {
      setFormError((cause as Error).message);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4">
      <h3 className="text-[13px] font-semibold">Tindak lanjut Compliance</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] text-[#64748B]">
          Status
          <select value={kind} onChange={(event) => { setKind(event.target.value as FindingKind); setFormError(null); }} className={INPUT_CLASS}>
            {FINDING_KINDS.map((option) => (
              <option key={option} value={option}>{FINDING_KIND_LABELS[option]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#64748B]">
          Owner
          <select value={ownerId} onChange={(event) => { setOwnerId(event.target.value); setFormError(null); }} className={INPUT_CLASS}>
            <option value="">— Belum ada —</option>
            {pics.map((pic) => (
              <option key={pic.id} value={pic.id}>{pic.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[12px] text-[#64748B]">
        Catatan
        <textarea
          rows={3}
          value={note}
          onChange={(event) => { setNote(event.target.value); setFormError(null); }}
          placeholder="Catatan tindak lanjut / dasar penyelesaian..."
          aria-invalid={formError ? true : undefined}
          aria-describedby={formError ? "follow-up-error" : undefined}
          className={cn(INPUT_CLASS, "h-auto py-2", formError && "border-[#DC2626]")}
        />
      </label>
      {kind === "RESOLVED" && finding.kind !== "RESOLVED" && (
        <p className="text-[12px] text-[#64748B]">Resolved wajib disertai catatan dasar penyelesaian minimal 10 karakter.</p>
      )}
      {formError && <p id="follow-up-error" role="alert" className="text-[12.5px] text-[#B91C1C]">{formError}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={followUp.isPending}
          className="h-9 rounded-lg bg-[#1677FF] px-3.5 text-[13px] font-medium text-white outline-none hover:bg-[#0F62D6] focus-visible:ring-2 focus-visible:ring-[#1677FF]/40 disabled:opacity-60"
        >
          Simpan Tindak Lanjut
        </button>
        <button
          type="button"
          onClick={clarify}
          disabled={followUp.isPending || finding.kind === "RESOLVED"}
          className={cn(INPUT_CLASS, "font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-50")}
        >
          Minta klarifikasi ke {sourceLabel(finding.sourceWorkspace)}
        </button>
      </div>
      <p className="text-[11.5px] text-[#64748B]">Compliance mencatat status dan permintaan; koreksi data dilakukan di workspace sumber.</p>
    </section>
  );
}

export function FindingDrawer({ findingId, pics, onClose }: { findingId: string | null; pics: { id: string; name: string }[]; onClose: () => void }) {
  const { data: finding, isLoading } = useFinding(findingId);

  return (
    <Sheet open={findingId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-[520px] bg-white text-[#10233F]">
        {isLoading || !finding ? (
          <>
            <SheetHeader className="border-b border-[#E5EAF0]">
              <SheetTitle className="text-base">Memuat temuan…</SheetTitle>
              <SheetDescription className="sr-only">Detail temuan sedang dimuat</SheetDescription>
            </SheetHeader>
            <SheetBody className="py-4">
              <div className="h-24 animate-pulse rounded-xl bg-[#EEF2F6]" aria-hidden />
            </SheetBody>
          </>
        ) : (
          <>
            <SheetHeader className="border-b border-[#E5EAF0]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Temuan · {finding.issueNumber} · {finding.applicationNumber}
              </span>
              <SheetTitle className="text-base leading-snug">{finding.title}</SheetTitle>
              <SheetDescription className="sr-only">Detail dan tindak lanjut temuan {finding.issueNumber}</SheetDescription>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">{sourceLabel(finding.sourceWorkspace)}</span>
                <Pill tone={KIND_TONE[finding.kind]}>{FINDING_KIND_LABELS[finding.kind]}</Pill>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4 py-4 text-[13px]">
              <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
                <dt className="text-[#64748B]">Case</dt>
                <dd>
                  <Link
                    href={`${COMPLIANCE_HOME}/permohonan/${finding.applicationId}?step=${stepOfRequirement(finding.requirementKey)}`}
                    className="font-mono text-[#1677FF] hover:underline"
                  >
                    {finding.applicationNumber}
                  </Link>
                  <span className="block text-[12px] text-[#64748B]">{finding.companyName}</span>
                </dd>
                <dt className="text-[#64748B]">Requirement</dt>
                <dd>{REQUIREMENT_LABELS[finding.requirementKey] ?? finding.requirementKey}</dd>
                <dt className="text-[#64748B]">Severity</dt>
                <dd>{FINDING_SEVERITY_LABELS[finding.severity]}</dd>
                <dt className="text-[#64748B]">Owner</dt>
                <dd>{finding.ownerName ?? "—"}</dd>
                <dt className="text-[#64748B]">Dicatat oleh</dt>
                <dd>{finding.createdByName ?? "—"} · {formatDateTime(finding.createdAt)}</dd>
              </dl>

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Data A", finding.evidenceA],
                  ["Data B", finding.evidenceB],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#E5EAF0] px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</span>
                    <p className="mt-0.5">{value || "—"}</p>
                  </div>
                ))}
              </div>

              <FollowUpForm key={`${finding.id}-${finding.updatedAt}`} finding={finding} pics={pics} />

              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold">Riwayat</h3>
                <ol className="flex flex-col gap-2 border-l border-[#E5EAF0] pl-4">
                  {[...finding.followUps].reverse().map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-[#94A3B8]" aria-hidden />
                      <p>{entry.note}</p>
                      <p className="text-[11.5px] text-[#64748B]">{entry.actorName ?? "—"} · {formatDateTime(entry.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
