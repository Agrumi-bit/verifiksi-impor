export type ExpiryStatus = "expired" | "expiring_soon" | "ok" | "none";

const EXPIRY_WINDOW_DAYS = 30;

/** Shared by every document/quality-test list in Merk Management — purely
 * about the expiry *date*, never about verification. See the Merek
 * Management navigation report on why "Verified" never appears here. */
export function getExpiryStatus(expiryDate: string | Date | null): ExpiryStatus {
  if (!expiryDate) return "none";
  const date = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const horizon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (date < now) return "expired";
  if (date <= horizon) return "expiring_soon";
  return "ok";
}

export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  expired: "Kedaluwarsa",
  expiring_soon: "Akan Kedaluwarsa",
  ok: "Berlaku",
  none: "Tidak ada tanggal",
};

export const EXPIRY_STATUS_CLASSES: Record<ExpiryStatus, string> = {
  expired: "bg-destructive/10 text-destructive",
  expiring_soon: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/10 text-emerald-600",
  none: "bg-muted text-muted-foreground",
};

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
