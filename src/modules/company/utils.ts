export type CompanyStatusValue = "ACTIVE" | "INACTIVE";

export const STATUS_LABEL: Record<CompanyStatusValue, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
};

export const STATUS_STYLE: Record<CompanyStatusValue, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e2f7ea", color: "#1a7a4c" },
  INACTIVE: { bg: "#f2f0ee", color: "#8a7565" },
};

const AVATAR_COLORS = ["#e0662e", "#594138", "#c14a1f", "#a68f80"];

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function avatarColor(name: string): string {
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function fmtDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
