"use client";

export type CompletionRow = { label: string; complete: boolean; detail?: string };

type Props = {
  rows: CompletionRow[];
  percent: number;
};

/** "Ringkasan Kelengkapan" — a section-by-section completeness readout,
 * distinct from BrandReadinessSummary's pass/fail checklist: this one shows
 * *where* things stand (including non-blocking info like Hasil Uji Mutu's
 * record count) rather than gating submit. */
export function CompletionProgress({ rows, percent }: Props) {
  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Ringkasan Kelengkapan</p>
        <span className="text-sm font-bold text-primary">{percent}% Lengkap</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className={row.complete ? "font-medium text-emerald-600" : "font-medium text-muted-foreground"}>
              {row.detail ?? (row.complete ? "Complete" : "Incomplete")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
