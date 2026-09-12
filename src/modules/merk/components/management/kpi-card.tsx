"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  /** Click handler for cards that filter the page in place rather than
   * navigate (e.g. "Semua Merek"'s KPI-as-filter cards). Ignored when
   * `href` is set. */
  onClick?: () => void;
  isLoading?: boolean;
  tone?: "default" | "warning" | "danger";
  active?: boolean;
};

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-foreground text-background",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
};

/** Same compact KPI-card convention as the platform dashboard's own
 * `StatCard` (see src/modules/dashboard/components/dashboard-stats.tsx) —
 * reused here instead of inventing a second visual pattern for Merk
 * Management's own dashboards. */
export function KpiCard({ label, value, icon: Icon, href, onClick, isLoading, tone = "default", active }: Props) {
  const content = (
    <>
      <span className={cn("flex size-9 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-2xl font-semibold">{isLoading ? "—" : value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </>
  );

  const className = cn(
    "flex flex-col gap-3 rounded-xl border bg-background p-5 text-left",
    active ? "border-primary ring-1 ring-primary" : "border-border",
  );

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:bg-muted/40")}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, "w-full cursor-pointer hover:bg-muted/40")}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
