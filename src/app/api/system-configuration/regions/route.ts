import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

const PAGE_SIZE = 50;

/**
 * Admin browser + editor over the seeded IndonesiaRegion reference table (81k+ rows).
 * Paginated + searchable rather than reusing `createMasterDataListRoute`'s load-everything
 * GET, which would ship all 81k rows to the browser in one response. Province/City/District
 * ids are reused when the typed name matches an existing row at that level (case-insensitive),
 * so adding "Kecamatan Baru" under an existing "Jawa Barat" doesn't fork a second province id
 * for the same province — see helper below. A reseed from `scripts/seed-regions.mjs` wipes
 * admin-added rows along with everything else (it deletes the whole table first), same as any
 * other edit made outside the seed source.
 */
export async function GET(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const provinceId = Number(url.searchParams.get("provinceId")) || undefined;
  const cityId = Number(url.searchParams.get("cityId")) || undefined;
  const districtId = Number(url.searchParams.get("districtId")) || undefined;
  const subdistrictId = Number(url.searchParams.get("subdistrictId")) || undefined;

  const where = {
    ...(provinceId ? { provinceId } : {}),
    ...(cityId ? { cityId } : {}),
    ...(districtId ? { districtId } : {}),
    ...(subdistrictId ? { subdistrictId } : {}),
    ...(search
      ? {
          OR: [
            { provinceName: { contains: search, mode: "insensitive" as const } },
            { cityName: { contains: search, mode: "insensitive" as const } },
            { districtName: { contains: search, mode: "insensitive" as const } },
            { subdistrictName: { contains: search, mode: "insensitive" as const } },
            { postalCode: { contains: search } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.indonesiaRegion.findMany({
      where,
      orderBy: [{ provinceName: "asc" }, { cityName: "asc" }, { districtName: "asc" }, { subdistrictName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.indonesiaRegion.count({ where }),
  ]);

  return NextResponse.json({ data: rows, total, page, pageSize: PAGE_SIZE });
}

const createSchema = z.object({
  provinceName: z.string().trim().min(1, "Provinsi wajib diisi"),
  cityName: z.string().trim().min(1, "Kota / Kabupaten wajib diisi"),
  districtName: z.string().trim().min(1, "Kecamatan wajib diisi"),
  subdistrictName: z.string().trim().min(1, "Desa / Kelurahan wajib diisi"),
  postalCode: z.string().trim().min(1, "Kode pos wajib diisi"),
});

/** Reuse an existing province's id (matched case-insensitively); otherwise allocate the next id above the current max. */
async function resolveProvinceId(provinceName: string): Promise<number> {
  const existing = await db.indonesiaRegion.findFirst({
    where: { provinceName: { equals: provinceName, mode: "insensitive" } },
    select: { provinceId: true },
  });
  if (existing) return existing.provinceId;
  const max = await db.indonesiaRegion.aggregate({ _max: { provinceId: true } });
  return (max._max.provinceId ?? 0) + 1;
}

/** Reuse an existing city's id within the given province (matched case-insensitively); otherwise allocate the next id above the current max. */
async function resolveCityId(provinceId: number, cityName: string): Promise<number> {
  const existing = await db.indonesiaRegion.findFirst({
    where: { provinceId, cityName: { equals: cityName, mode: "insensitive" } },
    select: { cityId: true },
  });
  if (existing) return existing.cityId;
  const max = await db.indonesiaRegion.aggregate({ _max: { cityId: true } });
  return (max._max.cityId ?? 0) + 1;
}

/** Reuse an existing district's id within the given city (matched case-insensitively); otherwise allocate the next id above the current max. */
async function resolveDistrictId(cityId: number, districtName: string): Promise<number> {
  const existing = await db.indonesiaRegion.findFirst({
    where: { cityId, districtName: { equals: districtName, mode: "insensitive" } },
    select: { districtId: true },
  });
  if (existing) return existing.districtId;
  const max = await db.indonesiaRegion.aggregate({ _max: { districtId: true } });
  return (max._max.districtId ?? 0) + 1;
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const { provinceName, cityName, districtName, subdistrictName, postalCode } = parsed.data;

  const provinceId = await resolveProvinceId(provinceName);
  const cityId = await resolveCityId(provinceId, cityName);
  const districtId = await resolveDistrictId(cityId, districtName);

  const existingSubdistrict = await db.indonesiaRegion.findFirst({
    where: { districtId, subdistrictName: { equals: subdistrictName, mode: "insensitive" } },
    select: { subdistrictId: true },
  });
  if (existingSubdistrict) {
    const duplicate = await db.indonesiaRegion.findFirst({
      where: { subdistrictId: existingSubdistrict.subdistrictId, postalCode },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Data dengan Desa/Kelurahan dan Kode Pos yang sama sudah terdaftar." }, { status: 409 });
    }
  }
  const subdistrictId =
    existingSubdistrict?.subdistrictId ??
    ((await db.indonesiaRegion.aggregate({ _max: { subdistrictId: true } }))._max.subdistrictId ?? 0) + 1;

  const row = await db.indonesiaRegion.create({
    data: {
      provinceId,
      provinceName: provinceName.toUpperCase(),
      cityId,
      cityName: cityName.toUpperCase(),
      districtId,
      districtName: districtName.toUpperCase(),
      subdistrictId,
      subdistrictName: subdistrictName.toUpperCase(),
      postalCode,
    },
  });

  return NextResponse.json({ data: row }, { status: 201 });
}
