import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCompanyAccess } from "@/lib/require-company-access";
import { appendCompanyLocation } from "@/modules/company/company-locations";

const bodySchema = z.object({
  location: z.unknown(),
  /** The application whose Step 5 this was added from (absent for a brand-new, unsaved one). */
  applicationId: z.string().trim().optional(),
});

/**
 * Step 5 "Tambah Lokasi Baru": saves a new facility straight into the company profile
 * (source "Ditambahkan saat permohonan") so the wizard can select it like any other company
 * location. The applicant's own company account or Admin only.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireCompanyAccess(id);
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const result = await appendCompanyLocation(id, parsed.data.location, {
    source: "APPLICATION",
    sourceApplicationId: parsed.data.applicationId || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status });
  return NextResponse.json({ data: result.location }, { status: 201 });
}
