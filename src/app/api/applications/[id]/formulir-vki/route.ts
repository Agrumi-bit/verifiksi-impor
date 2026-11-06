import { NextResponse } from "next/server";

import { loadVkiForm } from "@/modules/applications/vki-form/load.server";

/** Formulir Permohonan VKI (A–G + Lampiran) of one application — `[id]` is the id or the application number. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { form, error } = await loadVkiForm(decodeURIComponent(id));
  if (error) return error;
  return NextResponse.json({ data: form });
}
