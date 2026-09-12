"use client";

type Option<T extends string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
  value: T | undefined;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  columns?: 1 | 2;
};

/**
 * Shared radio-card control for Step 2's five legal-scenario selectors
 * (lokasi pemilik, jenis pemilik, hubungan API-U, jenis representasi, asal
 * penunjukan importir) — same selected/unselected treatment used in Step 1's
 * "Jenis Bukti Merek" cards, extracted here since Step 2 needs it five times.
 */
export function RadioCardGroup<T extends string>({ value, onChange, options, columns = 1 }: Props<T>) {
  return (
    <div className={columns === 2 ? "grid gap-2 sm:grid-cols-2" : "flex flex-col gap-2"}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              selected
                ? "flex items-start gap-3 rounded-lg border-2 border-primary bg-primary/5 px-3.5 py-3 text-left"
                : "flex items-start gap-3 rounded-lg border border-border px-3.5 py-3 text-left hover:bg-muted/50"
            }
          >
            <span
              className={
                selected
                  ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-primary"
                  : "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border"
              }
            >
              {selected && <span className="size-1.5 rounded-full bg-primary" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
