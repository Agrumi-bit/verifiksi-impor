function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Never sums different currencies into one meaningless number — renders one line per currency
 * actually present in `totals` (e.g. "USD 125,000.00" / "CNY 320,000.00"). Empty totals render a
 * plain dash rather than "0.00", since there's no currency to label it with yet.
 */
export function CurrencyTotals({ totals }: { totals: Map<string, number> }) {
  if (totals.size === 0) {
    return <p className="mt-1 text-sm font-semibold text-muted-foreground">—</p>;
  }
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {[...totals.entries()].map(([currency, value]) => (
        <p key={currency} className="text-sm font-bold">
          {currency} {formatMoney(value)}
        </p>
      ))}
    </div>
  );
}
