import { cn } from "@/lib/utils";

/**
 * Plain native `<select>` styled to match `Input` — used where a full
 * Controller-wired `@base-ui/react/select` is overkill (a handful of fixed
 * options with a required/optional string value, no async options).
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
