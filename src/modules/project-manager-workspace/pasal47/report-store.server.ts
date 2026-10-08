import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import type { Materiality, P47Report, ReportStatus } from "./types";

/*
 * pasal47_report (migration 37) is read/written with SQL rather than the generated Prisma client, same
 * as Application.lhviuDocument (lhviu-store.ts), so this runs against a client generated before the
 * table existed.
 */

const EMPTY: P47Report = { status: "DRAFT", pmNote: "", materiality: {}, updatedAt: null, updatedByName: null };
const STATUSES: ReportStatus[] = ["DRAFT", "REVIEWED", "APPROVED"];
const MATERIALITY: Materiality[] = ["MATERIAL", "NON_MATERIAL", "NEEDS_REVIEW"];

type Row = { status: string; pmNote: string; materiality: unknown; updatedAt: Date | null; updatedByName: string | null };

function parse(row: Row | undefined): P47Report {
  if (!row) return EMPTY;
  const raw = (row.materiality && typeof row.materiality === "object" ? row.materiality : {}) as Record<string, unknown>;
  const materiality: Record<string, Materiality> = {};
  for (const [k, v] of Object.entries(raw)) if (MATERIALITY.includes(v as Materiality)) materiality[k] = v as Materiality;
  return {
    status: STATUSES.includes(row.status as ReportStatus) ? (row.status as ReportStatus) : "DRAFT",
    pmNote: row.pmNote ?? "",
    materiality,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedByName: row.updatedByName,
  };
}

export async function readPasal47Report(scheme: string, from: string, to: string): Promise<P47Report> {
  const rows = await db.$queryRaw<Row[]>`
    SELECT "status", "pmNote", "materiality", "updatedAt", "updatedByName" FROM "pasal47_report"
    WHERE "scheme" = ${scheme} AND "periodFrom" = ${from} AND "periodTo" = ${to}`;
  return parse(rows[0]);
}

export type Pasal47ReportPatch = { status?: ReportStatus; pmNote?: string; materiality?: Record<string, Materiality> };

/** Upserts the PM's review state; `materiality` entries are merged into what is already stored. */
export async function writePasal47Report(
  scheme: string, from: string, to: string, patch: Pasal47ReportPatch, user: { id: string; name: string | null },
): Promise<P47Report> {
  const current = await readPasal47Report(scheme, from, to);
  const next = {
    status: patch.status ?? current.status,
    pmNote: patch.pmNote ?? current.pmNote,
    materiality: { ...current.materiality, ...(patch.materiality ?? {}) },
  };
  await db.$executeRaw`
    INSERT INTO "pasal47_report" ("id", "scheme", "periodFrom", "periodTo", "status", "pmNote", "materiality", "updatedById", "updatedByName", "updatedAt")
    VALUES (${randomUUID()}, ${scheme}, ${from}, ${to}, ${next.status}, ${next.pmNote}, ${JSON.stringify(next.materiality)}::jsonb, ${user.id}, ${user.name}, NOW())
    ON CONFLICT ("scheme", "periodFrom", "periodTo") DO UPDATE SET
      "status" = EXCLUDED."status", "pmNote" = EXCLUDED."pmNote", "materiality" = EXCLUDED."materiality",
      "updatedById" = EXCLUDED."updatedById", "updatedByName" = EXCLUDED."updatedByName", "updatedAt" = NOW()`;
  return readPasal47Report(scheme, from, to);
}
