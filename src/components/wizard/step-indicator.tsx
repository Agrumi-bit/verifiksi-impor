import { cn } from "@/lib/utils";

type StepIndicatorProps = {
  current: number;
  total: number;
};

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={cn(
            "h-1.5 rounded-full transition-all",
            step === current ? "w-6 bg-foreground" : "w-1.5",
            step < current
              ? "bg-emerald-500"
              : step === current
                ? "bg-foreground"
                : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}
