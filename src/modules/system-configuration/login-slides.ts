export const LOGIN_SLIDE_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export type LoginSlideStatusValue = (typeof LOGIN_SLIDE_STATUSES)[number];

export const LOGIN_SLIDE_STATUS_LABELS: Record<LoginSlideStatusValue, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const LOGIN_SLIDE_STATUS_BADGE: Record<LoginSlideStatusValue, string> = {
  DRAFT: "bg-[#eef0f6] text-[#5b6478]",
  ACTIVE: "bg-[#e6f6ec] text-[#1a9850]",
  INACTIVE: "bg-[#f1efe9] text-[#8a7565]",
};

type ScheduleFields = { status: string; startDate: Date | string | null; endDate: Date | string | null };

/**
 * A slide only actually renders on the login page when its manual `status` switch is
 * ACTIVE *and* it falls inside its optional schedule window — a slide with no
 * startDate/endDate stays visible indefinitely once switched ACTIVE. Computed fresh on
 * every read, never stored as a separate flag (would drift as the clock moves).
 */
export function isLoginSlideCurrentlyVisible(slide: ScheduleFields, now: Date = new Date()): boolean {
  if (slide.status !== "ACTIVE") return false;
  if (slide.startDate && now < new Date(slide.startDate)) return false;
  if (slide.endDate && now > new Date(slide.endDate)) return false;
  return true;
}
