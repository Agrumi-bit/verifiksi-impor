"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CHECKLIST_RESULTS, type SurveyReportDraftValues } from "../../schema";

const RESULT_LABELS: Record<(typeof CHECKLIST_RESULTS)[number], string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NA: "N/A",
};

const RESULT_STYLES: Record<(typeof CHECKLIST_RESULTS)[number], string> = {
  PASS: "bg-emerald-500 text-white border-emerald-500",
  FAIL: "bg-destructive text-white border-destructive",
  NA: "bg-muted text-foreground border-border",
};

type Props = {
  form: UseFormReturn<SurveyReportDraftValues>;
  disabled?: boolean;
};

export function ChecklistTab({ form, disabled }: Props) {
  const { control, register, watch } = form;
  const checklist = watch("checklist");

  const grouped = checklist.reduce<Record<string, { item: (typeof checklist)[number]; index: number }[]>>(
    (acc, item, index) => {
      const key = item.category;
      acc[key] = acc[key] ?? [];
      acc[key].push({ item, index });
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([category, entries]) => (
        <div key={category} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="flex flex-col gap-3">
            {entries.map(({ item, index }) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.item}</p>
                  <Controller
                    control={control}
                    name={`checklist.${index}.result`}
                    render={({ field }) => (
                      <div className="flex items-center gap-1.5">
                        {CHECKLIST_RESULTS.map((result) => (
                          <button
                            key={result}
                            type="button"
                            disabled={disabled}
                            onClick={() => field.onChange(result)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                              field.value === result
                                ? RESULT_STYLES[result]
                                : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            {RESULT_LABELS[result]}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
                <Input
                  placeholder="Catatan (opsional)"
                  disabled={disabled}
                  {...register(`checklist.${index}.notes`)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
