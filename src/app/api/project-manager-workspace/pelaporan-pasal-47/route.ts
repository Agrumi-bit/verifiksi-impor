import { NextResponse } from "next/server";
import { z } from "zod";

import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { buildPasal47Dataset } from "@/modules/project-manager-workspace/pasal47/dataset.server";
import { readPasal47Report, writePasal47Report } from "@/modules/project-manager-workspace/pasal47/report-store.server";

/** Pelaporan Pasal 47 covers VIU Barang Konsumsi only (Laporan Kemenperin of the VIU Konsumsi sub menu). */
const SCHEME = "konsumsi";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const periodSchema = z.object({ from: z.string().regex(DATE), to: z.string().regex(DATE) }).refine((p) => p.from <= p.to, "Periode tidak valid");

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — the report dataset plus the PM's saved review state for that period. */
export async function GET(request: Request) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const period = periodSchema.safeParse({ from: searchParams.get("from"), to: searchParams.get("to") });
  if (!period.success) return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });

  const [dataset, report] = await Promise.all([
    buildPasal47Dataset(period.data),
    readPasal47Report(SCHEME, period.data.from, period.data.to),
  ]);
  return NextResponse.json({ data: { dataset, report } });
}

const patchSchema = z.object({
  from: z.string().regex(DATE),
  to: z.string().regex(DATE),
  status: z.enum(["DRAFT", "REVIEWED", "APPROVED"]).optional(),
  pmNote: z.string().max(10000).optional(),
  materiality: z.record(z.string().max(300), z.enum(["MATERIAL", "NON_MATERIAL", "NEEDS_REVIEW"])).optional(),
});

/** PATCH — status, PM note and/or materiality of findings for one period. */
export async function PATCH(request: Request) {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const { from, to, ...patch } = parsed.data;
  const report = await writePasal47Report(SCHEME, from, to, patch, { id: session.user.id, name: session.user.name ?? null });
  return NextResponse.json({ data: report });
}
