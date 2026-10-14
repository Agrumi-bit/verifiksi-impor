import { db } from "@/lib/db";

/**
 * Uraian KBLI per kode from the KBLI master data (active rows; the newest version wins when a code
 * exists in several). Codes not in the master data are absent from the map — callers keep their
 * own (manually typed) description for those.
 */
export async function kbliMasterDescriptions(codes: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(codes.map((c) => (c ?? "").trim()).filter(Boolean))];
  if (wanted.length === 0) return new Map();
  const rows = await db.kbliMasterData.findMany({
    where: { code: { in: wanted }, status: "ACTIVE" },
    select: { code: true, description: true, version: true },
    orderBy: { version: "asc" },
  });
  const map = new Map<string, string>();
  for (const row of rows) if (row.description.trim()) map.set(row.code.trim(), row.description.trim());
  return map;
}
