import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

const patchSchema = z.object({
  provinceName: z.string().trim().min(1).optional(),
  cityName: z.string().trim().min(1).optional(),
  districtName: z.string().trim().min(1).optional(),
  subdistrictName: z.string().trim().min(1).optional(),
  postalCode: z.string().trim().min(1).optional(),
});

/**
 * Province/City/District/Subdistrict names are shared across every row carrying the same
 * id (the table is flat/denormalized — see the Prisma model comment), so renaming one of
 * those levels cascades to every sibling row with that id via `updateMany`, keeping the
 * `distinct` lookups in `/api/master-data/regions/*` consistent. Postal code has no
 * siblings to keep in sync — it's the one field that legitimately differs row-to-row for
 * the same subdistrict — so it's updated on this row alone.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const row = await db.indonesiaRegion.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const { provinceName, cityName, districtName, subdistrictName, postalCode } = parsed.data;

  await db.$transaction([
    ...(provinceName
      ? [db.indonesiaRegion.updateMany({ where: { provinceId: row.provinceId }, data: { provinceName: provinceName.toUpperCase() } })]
      : []),
    ...(cityName
      ? [db.indonesiaRegion.updateMany({ where: { cityId: row.cityId }, data: { cityName: cityName.toUpperCase() } })]
      : []),
    ...(districtName
      ? [db.indonesiaRegion.updateMany({ where: { districtId: row.districtId }, data: { districtName: districtName.toUpperCase() } })]
      : []),
    ...(subdistrictName
      ? [db.indonesiaRegion.updateMany({ where: { subdistrictId: row.subdistrictId }, data: { subdistrictName: subdistrictName.toUpperCase() } })]
      : []),
    ...(postalCode ? [db.indonesiaRegion.update({ where: { id }, data: { postalCode } })] : []),
  ]);

  const updated = await db.indonesiaRegion.findUnique({ where: { id } });
  return NextResponse.json({ data: updated });
}
