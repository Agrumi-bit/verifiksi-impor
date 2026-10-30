import { NextResponse } from "next/server";

import { requireComplianceSession } from "@/lib/require-compliance-session";
import { loadFinding } from "@/modules/compliance-workspace/server/findings";

/** One finding with its follow-up history. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireComplianceSession();
  if (error) return error;

  const { id } = await params;
  const finding = await loadFinding(id);
  if (!finding) return NextResponse.json({ error: "Temuan tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ data: finding });
}
