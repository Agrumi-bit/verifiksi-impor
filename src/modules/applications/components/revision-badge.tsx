/** "Revisi ke-N" marker for an assignment reopened after the company resubmitted a revision. */
export function RevisionBadge({ revisionCount, revisionReceivedAt }: { revisionCount?: number | null; revisionReceivedAt?: string | null }) {
  if (!revisionCount) return null;
  const received = revisionReceivedAt
    ? new Date(revisionReceivedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null;
  return (
    <span
      className="ml-1.5 inline-block rounded-full bg-[#fdf0d5] px-2 py-0.5 align-middle text-[10px] font-bold text-[#7a4a10]"
      title={received ? `Revisi diterima ${received}` : undefined}
    >
      Revisi ke-{revisionCount}
    </span>
  );
}
