// One-time (re-runnable) seed for the IndonesiaRegion reference table.
// Source: prisma/seed-data/indonesia-regions.csv, a copy of full.csv from
// https://github.com/teguh02/Wilayah-Indonesia-Beserta-Kode-Pos (province -> city/regency ->
// district -> subdistrict/village, one row per subdistrict + postal code).
//
// Run with: npx tsx --env-file=.env scripts/seed-regions.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "prisma", "seed-data", "indonesia-regions.csv");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function parseCsv(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const header = lines[0].split(",");
  const col = Object.fromEntries(header.map((name, i) => [name, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    rows.push({
      provinceId: Number(cols[col.prov_id]),
      provinceName: cols[col.prov_name],
      cityId: Number(cols[col.city_id]),
      cityName: cols[col.city_name],
      districtId: Number(cols[col.dis_id]),
      districtName: cols[col.dis_name],
      subdistrictId: Number(cols[col.subdis_id]),
      subdistrictName: cols[col.subdis_name],
      postalCode: cols[col.postal_code],
    });
  }
  return rows;
}

async function main() {
  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} rows from ${csvPath}`);

  const existing = await db.indonesiaRegion.count();
  if (existing > 0) {
    console.log(`Clearing ${existing} existing rows before reseeding...`);
    await db.indonesiaRegion.deleteMany({});
  }

  const BATCH_SIZE = 5000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.indonesiaRegion.createMany({ data: batch });
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log("Done.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
