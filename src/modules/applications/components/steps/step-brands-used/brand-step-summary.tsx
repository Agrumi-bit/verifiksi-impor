"use client";

type Props = {
  totalCount: number;
  readyCount: number;
  incompleteCount: number;
  notEligibleCount: number;
};

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

/** Four compact metrics derived live from `applicationBrands` + each Brand's
 * computed readiness — never hardcoded, never a separate counter that can
 * drift from the table below it. */
export function BrandStepSummary({ totalCount, readyCount, incompleteCount, notEligibleCount }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Merek Dipilih" value={totalCount} tone="neutral" />
      <MetricCard label="Siap Digunakan" value={readyCount} tone="success" />
      <MetricCard label="Perlu Dilengkapi" value={incompleteCount} tone="warning" />
      <MetricCard label="Tidak Dapat Digunakan" value={notEligibleCount} tone="danger" />
    </div>
  );
}
