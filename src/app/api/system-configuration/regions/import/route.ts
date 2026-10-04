import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

const MAX_IMPORT_ROWS = 20_000;

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        provinceName: z.string().trim().min(1),
        cityName: z.string().trim().min(1),
        districtName: z.string().trim().min(1),
        subdistrictName: z.string().trim().min(1),
        postalCode: z.string().trim().min(1),
      }),
    )
    .min(1, "Tidak ada baris untuk diimpor")
    .max(MAX_IMPORT_ROWS, `Maksimal ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris sekali impor`),
});

const norm = (value: string) => value.trim().toUpperCase();

/**
 * Bulk import for Data Wilayah from the admin Excel upload. Applies the same id-reuse rules as
 * the single-row POST in `../route.ts` — a Provinsi is matched by name, a Kota/Kabupaten by name
 * within its Provinsi, a Kecamatan within its Kota, a Desa/Kelurahan within its Kecamatan (all
 * case-insensitive) — but resolves every row against in-memory maps built from one read of the
 * table, instead of several queries per row, so a file with thousands of rows stays fast. A row
 * whose (Desa/Kelurahan, Kode Pos) pair already exists, in the table or earlier in the same
 * file, is skipped as a duplicate.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const existing = await db.indonesiaRegion.findMany({
    select: {
      provinceId: true,
      provinceName: true,
      cityId: true,
      cityName: true,
      districtId: true,
      districtName: true,
      subdistrictId: true,
      subdistrictName: true,
      postalCode: true,
    },
  });

  const provinceIds = new Map<string, number>();
  const cityIds = new Map<string, number>();
  const districtIds = new Map<string, number>();
  const subdistrictIds = new Map<string, number>();
  const pairs = new Set<string>();
  let maxProvinceId = 0;
  let maxCityId = 0;
  let maxDistrictId = 0;
  let maxSubdistrictId = 0;

  for (const row of existing) {
    provinceIds.set(norm(row.provinceName), row.provinceId);
    cityIds.set(`${row.provinceId}|${norm(row.cityName)}`, row.cityId);
    districtIds.set(`${row.cityId}|${norm(row.districtName)}`, row.districtId);
    subdistrictIds.set(`${row.districtId}|${norm(row.subdistrictName)}`, row.subdistrictId);
    pairs.add(`${row.subdistrictId}|${row.postalCode.trim()}`);
    maxProvinceId = Math.max(maxProvinceId, row.provinceId);
    maxCityId = Math.max(maxCityId, row.cityId);
    maxDistrictId = Math.max(maxDistrictId, row.districtId);
    maxSubdistrictId = Math.max(maxSubdistrictId, row.subdistrictId);
  }

  function resolve(map: Map<string, number>, key: string, nextId: () => number): number {
    const found = map.get(key);
    if (found !== undefined) return found;
    const id = nextId();
    map.set(key, id);
    return id;
  }

  const toCreate: {
    provinceId: number;
    provinceName: string;
    cityId: number;
    cityName: string;
    districtId: number;
    districtName: string;
    subdistrictId: number;
    subdistrictName: string;
    postalCode: string;
  }[] = [];
  const duplicates: string[] = [];

  for (const row of parsed.data.rows) {
    const provinceName = norm(row.provinceName);
    const cityName = norm(row.cityName);
    const districtName = norm(row.districtName);
    const subdistrictName = norm(row.subdistrictName);
    const postalCode = row.postalCode.trim();

    const provinceId = resolve(provinceIds, provinceName, () => ++maxProvinceId);
    const cityId = resolve(cityIds, `${provinceId}|${cityName}`, () => ++maxCityId);
    const districtId = resolve(districtIds, `${cityId}|${districtName}`, () => ++maxDistrictId);
    const subdistrictId = resolve(subdistrictIds, `${districtId}|${subdistrictName}`, () => ++maxSubdistrictId);

    const pairKey = `${subdistrictId}|${postalCode}`;
    if (pairs.has(pairKey)) {
      duplicates.push(`${subdistrictName} (${postalCode})`);
      continue;
    }
    pairs.add(pairKey);
    toCreate.push({
      provinceId,
      provinceName,
      cityId,
      cityName,
      districtId,
      districtName,
      subdistrictId,
      subdistrictName,
      postalCode,
    });
  }

  if (toCreate.length > 0) {
    await db.indonesiaRegion.createMany({ data: toCreate });
  }

  // Only a few names go back for the toast — a re-uploaded full dataset would otherwise echo
  // tens of thousands of duplicate labels in the response.
  return NextResponse.json({
    data: { created: toCreate.length, duplicateCount: duplicates.length, duplicateSamples: duplicates.slice(0, 5) },
  });
}
