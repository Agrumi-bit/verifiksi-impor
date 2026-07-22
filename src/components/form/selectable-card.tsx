import { cn } from "@/lib/utils";

type SelectableCardProps = {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function SelectableCard({
  selected,
  onSelect,
  disabled = false,
  className,
  children,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-border opacity-60"
          : selected
            ? "border-foreground bg-muted/60"
            : "border-border hover:bg-muted/30",
        className,
      )}
    >
      {children}
    </button>
  );
}
