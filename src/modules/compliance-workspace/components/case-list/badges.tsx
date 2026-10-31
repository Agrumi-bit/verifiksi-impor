import { cn } from "@/lib/utils";
import {
  CASE_CATEGORY_LABELS,
  HANDOVER_LABELS,
  READINESS_LABELS,
  type CaseCategory,
  type HandoverStatus,
  type Readiness,
} from "../../consolidation";
import { WORKSPACE_KEYS, WORKSPACE_LABELS, WORKSPACE_STATE_LABELS, type WorkspaceState, type WorkspaceStatuses } from "../../workspace-status";

/** Semantic tones from the handoff design tokens (green ok, orange waiting/attention, red issue). */
const TONES = {
  green: "bg-[#ECFDF3] text-[#15803D]",
  blue: "bg-[#EAF2FF] text-[#1D4ED8]",
  orange: "bg-[#FFF7E6] text-[#B45309]",
  red: "bg-[#FEF2F2] text-[#B91C1C]",
  purple: "bg-[#F3EEFF] text-[#6D28D9]",
  slate: "bg-[#F1F5F9] text-[#475569]",
} as const;
type Tone = keyof typeof TONES;

const CATEGORY_TONE: Record<CaseCategory, Tone> = { MH: "orange", SK: "blue", PTL: "orange", OI: "red", CL: "green", SL: "purple" };
const HANDOVER_TONE: Record<HandoverStatus, Tone> = {
  MENUNGGU_HANDOVER: "orange",
  HANDOVER_SEBAGIAN: "red",
  SIAP_KONSOLIDASI: "blue",
  HANDOVER_LENGKAP: "green",
};
const READINESS_TONE: Record<Readiness, Tone> = { waiting_handover: "orange", needs_follow_up: "red", ready: "green" };
const STATE_DOT: Record<WorkspaceState, string> = {
  COMPLETED: "bg-[#16A34A]",
  IN_PROGRESS: "bg-[#1677FF]",
  ISSUE: "bg-[#DC2626]",
  NOT_STARTED: "bg-[#CBD5E1]",
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium", TONES[tone], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category: CaseCategory }) {
  return <Pill tone={CATEGORY_TONE[category]}>{CASE_CATEGORY_LABELS[category]}</Pill>;
}

export function HandoverBadge({ handover }: { handover: HandoverStatus }) {
  return <Pill tone={HANDOVER_TONE[handover]}>{HANDOVER_LABELS[handover]}</Pill>;
}

export function ReadinessText({ readiness }: { readiness: Readiness }) {
  return (
    <span title="Consolidation Readiness" className={cn("rounded px-1.5 py-px text-[11px] font-medium", TONES[READINESS_TONE[readiness]])}>
      {READINESS_LABELS[readiness]}
    </span>
  );
}

export function LhviuBadge({ issued }: { issued: boolean }) {
  return issued ? <Pill tone="green">Terbit</Pill> : <Pill tone="slate">Belum Terbit</Pill>;
}

/** One dot per workspace, CR → PM, with the state in the tooltip and in screen-reader text. */
export function WorkspaceProgress({ workspaces, completed }: { workspaces: WorkspaceStatuses; completed: number }) {
  const description = WORKSPACE_KEYS.map((key) => `${WORKSPACE_LABELS[key]}: ${WORKSPACE_STATE_LABELS[workspaces[key]]}`).join(", ");
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1" role="img" aria-label={description}>
        {WORKSPACE_KEYS.map((key) => (
          <span key={key} title={`${WORKSPACE_LABELS[key]}: ${WORKSPACE_STATE_LABELS[workspaces[key]]}`} className="flex flex-col items-center gap-0.5">
            <span className={cn("size-2.5 rounded-full", STATE_DOT[workspaces[key]])} />
            <span className="text-[9px] font-medium leading-none text-[#64748B]">{key}</span>
          </span>
        ))}
      </span>
      <span className="text-[11.5px] tabular-nums text-[#64748B]">{completed}/{WORKSPACE_KEYS.length}</span>
    </div>
  );
}

export function WorkspaceStateBadge({ state }: { state: WorkspaceState }) {
  const tone: Record<WorkspaceState, Tone> = { COMPLETED: "green", IN_PROGRESS: "blue", ISSUE: "red", NOT_STARTED: "slate" };
  return <Pill tone={tone[state]}>{WORKSPACE_STATE_LABELS[state]}</Pill>;
}
