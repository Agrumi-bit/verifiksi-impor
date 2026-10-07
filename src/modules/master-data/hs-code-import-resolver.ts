/**
 * Pure (no XLSX / no fetch) resolution of HS Code Excel rows against master data, so it can be
 * unit-tested with `node --test`.
 *
 * Rules:
 * - "Sub Kelompok Komoditas" resolves by its code when "Kode Sub Kelompok Komoditas" is filled,
 *   otherwise by name — narrowed by "Kelompok Komoditas" (name or code) when the name alone is
 *   shared by several Sub Kelompok (e.g. "Kain Tenun" exists under Tekstil and under Batik).
 *   ACTIVE rows win over INACTIVE ones with the same name.
 * - "Komoditas" ALWAYS resolves inside the resolved Sub Kelompok (by code, or by name). Names like
 *   "Dari Kapas" exist under many Sub Kelompok; matching them globally used to attach HS Codes to
 *   the wrong parent.
 * - "Satuan" matches unit name OR symbol, plus a few common spellings (Kg, Meter Persegi, m²…).
 * Nothing is guessed: an ambiguous or unknown value becomes an issue with the row number, column
 * and the value as typed, so the importer can show exactly what to fix.
 */

export type RefCommodityGroup = {
  id: string;
  name: string;
  code: string;
  status?: string;
  industryGroup?: { name: string; code: string } | null;
};
export type RefCommoditySubGroup = { id: string; name: string; code: string; status?: string; commodityGroupId: string };
export type RefUnit = { id: string; name: string; symbol: string; status?: string };

export type HsCodeSheetRow = {
  rowNumber: number;
  hsCode: string;
  description: string;
  industryGroup: string;
  commodityGroup: string;
  commodityGroupCode: string;
  commoditySubGroup: string;
  commoditySubGroupCode: string;
  unit: string;
};

export type ResolvedHsCodeRow = {
  hsCode: string;
  description: string;
  commodityGroupId: string;
  commoditySubGroupId: string;
  unitOfMeasurementId: string;
};

export type HsCodeImportIssue = {
  rowNumber: number;
  hsCode: string;
  column: string;
  value: string;
  reason: string;
};

const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const UNIT_ALIASES: Record<string, string> = {
  kg: "kilogram",
  kgs: "kilogram",
  kilo: "kilogram",
  "meter persegi": "m2",
  "m²": "m2",
  "sqm": "m2",
  m: "meter",
  mtr: "meter",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  buah: "pcs",
  potong: "pcs",
  psg: "pasang",
  pair: "pasang",
  pairs: "pasang",
  yd: "yard",
  yds: "yard",
};

function preferActive<T extends { status?: string }>(items: T[]): T[] {
  const active = items.filter((item) => !item.status || item.status === "ACTIVE");
  return active.length > 0 ? active : items;
}

export function resolveHsCodeRows(
  sheetRows: HsCodeSheetRow[],
  refs: { commodityGroups: RefCommodityGroup[]; commoditySubGroups: RefCommoditySubGroup[]; units: RefUnit[] },
): { rows: ResolvedHsCodeRow[]; issues: HsCodeImportIssue[]; skippedRows: number } {
  const rows: ResolvedHsCodeRow[] = [];
  const issues: HsCodeImportIssue[] = [];
  let skippedRows = 0;

  const unitByKey = new Map<string, RefUnit>();
  for (const unit of preferActive(refs.units)) {
    unitByKey.set(norm(unit.name), unit);
    unitByKey.set(norm(unit.symbol), unit);
  }

  for (const row of sheetRows) {
    if (!row.hsCode.trim() || !row.description.trim()) {
      skippedRows += 1;
      continue;
    }
    const rowIssues: HsCodeImportIssue[] = [];
    const issue = (column: string, value: string, reason: string) =>
      rowIssues.push({ rowNumber: row.rowNumber, hsCode: row.hsCode.trim(), column, value: value.trim(), reason });

    // --- Sub Kelompok Komoditas (CommodityGroup) ---
    let group: RefCommodityGroup | undefined;
    if (row.commodityGroupCode.trim()) {
      const matches = refs.commodityGroups.filter((g) => norm(g.code) === norm(row.commodityGroupCode));
      if (matches.length === 0) issue("Kode Sub Kelompok Komoditas", row.commodityGroupCode, "Kode tidak terdaftar di master Sub Kelompok Komoditas");
      else if (matches.length > 1) issue("Kode Sub Kelompok Komoditas", row.commodityGroupCode, "Kode dipakai lebih dari satu Sub Kelompok Komoditas");
      else group = matches[0];
      if (group && row.commodityGroup.trim() && norm(group.name) !== norm(row.commodityGroup)) {
        issue("Sub Kelompok Komoditas", row.commodityGroup, `Nama tidak sesuai dengan kode ${group.code} (${group.name})`);
        group = undefined;
      }
    } else if (!row.commodityGroup.trim()) {
      issue("Sub Kelompok Komoditas", "", "Kolom kosong");
    } else {
      let matches = refs.commodityGroups.filter((g) => norm(g.name) === norm(row.commodityGroup));
      if (matches.length > 1 && row.industryGroup.trim()) {
        const wanted = norm(row.industryGroup);
        const narrowed = matches.filter(
          (g) => g.industryGroup && (norm(g.industryGroup.name) === wanted || norm(g.industryGroup.code) === wanted),
        );
        if (narrowed.length > 0) matches = narrowed;
      }
      if (matches.length > 1) matches = preferActive(matches);
      if (matches.length === 0) issue("Sub Kelompok Komoditas", row.commodityGroup, "Nama tidak terdaftar di master Sub Kelompok Komoditas");
      else if (matches.length > 1)
        issue(
          "Sub Kelompok Komoditas",
          row.commodityGroup,
          `Nama ambigu (${matches.map((m) => `${m.code}${m.industryGroup ? " – " + m.industryGroup.name : ""}`).join("; ")}) — isi kolom Kelompok Komoditas atau Kode Sub Kelompok Komoditas`,
        );
      else group = matches[0];
    }

    // --- Komoditas (CommoditySubGroup), always inside the resolved Sub Kelompok ---
    let subGroup: RefCommoditySubGroup | undefined;
    if (group) {
      const children = refs.commoditySubGroups.filter((s) => s.commodityGroupId === group!.id);
      if (row.commoditySubGroupCode.trim()) {
        const byCode = refs.commoditySubGroups.filter((s) => norm(s.code) === norm(row.commoditySubGroupCode));
        const inGroup = byCode.filter((s) => s.commodityGroupId === group!.id);
        if (byCode.length === 0) issue("Kode Komoditas", row.commoditySubGroupCode, "Kode tidak terdaftar di master Komoditas");
        else if (inGroup.length === 0) issue("Kode Komoditas", row.commoditySubGroupCode, `Kode ini bukan Komoditas di bawah Sub Kelompok ${group.code} (${group.name})`);
        else if (inGroup.length > 1) issue("Kode Komoditas", row.commoditySubGroupCode, "Kode dipakai lebih dari satu Komoditas");
        else subGroup = inGroup[0];
        if (subGroup && row.commoditySubGroup.trim() && norm(subGroup.name) !== norm(row.commoditySubGroup)) {
          issue("Komoditas", row.commoditySubGroup, `Nama tidak sesuai dengan kode ${subGroup.code} (${subGroup.name})`);
          subGroup = undefined;
        }
      } else if (!row.commoditySubGroup.trim()) {
        issue("Komoditas", "", "Kolom kosong");
      } else {
        let matches = children.filter((s) => norm(s.name) === norm(row.commoditySubGroup));
        if (matches.length > 1) matches = preferActive(matches);
        if (matches.length === 0)
          issue("Komoditas", row.commoditySubGroup, `Tidak ada Komoditas dengan nama ini di bawah Sub Kelompok ${group.code} (${group.name})`);
        else if (matches.length > 1) issue("Komoditas", row.commoditySubGroup, `Nama ambigu (${matches.map((m) => m.code).join(", ")}) — isi kolom Kode Komoditas`);
        else subGroup = matches[0];
      }
    }

    // --- Satuan ---
    let unit: RefUnit | undefined;
    if (!row.unit.trim()) issue("Satuan", "", "Kolom kosong");
    else {
      const key = norm(row.unit);
      unit = unitByKey.get(key) ?? unitByKey.get(UNIT_ALIASES[key] ?? "");
      if (!unit) issue("Satuan", row.unit, `Satuan tidak terdaftar (yang ada: ${preferActive(refs.units).map((u) => u.name).join(", ")})`);
    }

    if (rowIssues.length > 0 || !group || !subGroup || !unit) {
      issues.push(...rowIssues);
      continue;
    }
    rows.push({
      hsCode: row.hsCode.trim(),
      description: row.description.trim(),
      commodityGroupId: group.id,
      commoditySubGroupId: subGroup.id,
      unitOfMeasurementId: unit.id,
    });
  }

  return { rows, issues, skippedRows };
}

/** One line per distinct (column, value) — e.g. `Satuan "Meter Persegi" (66 baris)` — for the toast. */
export function summarizeIssues(issues: HsCodeImportIssue[], limit = 5): string[] {
  const counts = new Map<string, { column: string; value: string; rows: Set<number> }>();
  for (const issue of issues) {
    const key = `${issue.column}\u0000${issue.value}`;
    const entry = counts.get(key) ?? { column: issue.column, value: issue.value, rows: new Set<number>() };
    entry.rows.add(issue.rowNumber);
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.rows.size - a.rows.size)
    .slice(0, limit)
    .map((e) => `${e.column} "${e.value || "(kosong)"}" (${e.rows.size} baris)`);
}
