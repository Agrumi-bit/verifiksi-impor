import type { LocationValues } from "./schema";

/**
 * Provenance badge + snapshot staleness for a location, shared by Step 5 and every workspace
 * that lists an application's locations. No db import — client-safe.
 */

type LocationLike = Partial<LocationValues> & { id: string };

export type LocationSourceBadge = { label: string; tone: "profile" | "application" | "field" };

export function locationSourceBadge(location: Pick<LocationLike, "source" | "discoveredByName" | "discoveredAt">): LocationSourceBadge {
  if (location.source === "FIELD_DISCOVERY") {
    const date = location.discoveredAt
      ? new Date(location.discoveredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : null;
    const detail = [location.discoveredByName, date].filter(Boolean).join(", ");
    return { label: `Temuan lapangan${detail ? ` (${detail})` : ""}`, tone: "field" };
  }
  if (location.source === "APPLICATION") return { label: "Ditambahkan saat permohonan", tone: "application" };
  return { label: "Profil perusahaan", tone: "profile" };
}

export const LOCATION_SOURCE_BADGE_STYLE: Record<LocationSourceBadge["tone"], { bg: string; color: string }> = {
  profile: { bg: "#eef3fd", color: "#1f3f7a" },
  application: { bg: "#f1e6fd", color: "#6a35a8" },
  field: { bg: "#fdf0d5", color: "#7a4a10" },
};

/** The Company.locations entry an application location is a snapshot of (by companyLocationId, else by its own id). */
export function companyLocationIdOf(location: Pick<LocationLike, "id" | "companyLocationId">): string {
  return location.companyLocationId || location.id;
}

const COMPARED_FIELDS: (keyof LocationValues)[] = [
  "locationType",
  "address",
  "addressDesa",
  "addressKecamatan",
  "city",
  "province",
  "country",
  "postalCode",
  "googleMapsLink",
  "buildingStatus",
  "ownershipDocuments",
  "leaseOriginalOwnerName",
  "leaseStartDate",
  "leaseEndDate",
  "leaseDocuments",
  "warehouseRegistrationType",
  "warehouseRegistrationNumber",
  "warehouseRegistrationDocumentPath",
  "warehouseLayoutDocumentPath",
];

const norm = (value: unknown) => JSON.stringify(value ?? "");

/** True when the company profile's live entry differs from what the application captured
 * ("Data lokasi diperbarui setelah pengajuan"). */
export function isLocationSnapshotStale(snapshot: LocationLike, live: LocationLike | null | undefined): boolean {
  if (!live) return false;
  return COMPARED_FIELDS.some((field) => norm(snapshot[field]) !== norm(live[field]));
}
