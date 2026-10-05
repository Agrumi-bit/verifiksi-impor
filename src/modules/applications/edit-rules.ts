/** Shared by the Admin edit page (read-only notice) and PUT /api/applications/[id] (enforcement). */
export const NON_EDITABLE_APPLICATION_STATUSES = ["COMPLETED", "REJECTED", "WITHDRAWN"] as const;

export const EDIT_REASON_MIN_LENGTH = 10;

const NOT_EDITABLE_REASON: Record<string, string> = {
  COMPLETED: "Permohonan sudah selesai sehingga datanya tidak dapat diubah lagi.",
  REJECTED: "Permohonan sudah ditolak sehingga datanya tidak dapat diubah lagi.",
  WITHDRAWN: "Permohonan sudah ditarik oleh perusahaan sehingga datanya tidak dapat diubah lagi.",
};

export function getAdminEditBlockReason(status: string): string | null {
  return NOT_EDITABLE_REASON[status] ?? null;
}

/** Assignment statuses that mean someone is still working on (verifying) the application's data. */
export const ACTIVE_ASSIGNMENT_STATUSES = ["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "SUBMITTED"] as const;

export function isActiveAssignmentStatus(status: string): boolean {
  return (ACTIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(status);
}
