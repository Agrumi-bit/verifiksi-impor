// Stage D of the Step 7/9 VIU Konsumsi refactor — one-time cleanup of the old pre-refactor
// payload shape. Per the user's explicit "no backward compatibility" decision: old
// `brandQualityTests` data is deleted outright (never migrated into the new shape — label
// documents and quality-test certificates must be re-collected fresh via Step "Dokumen Label
// Produk" / "Product Information" or the CR/Verifikator upload-on-behalf flow from Stage E).
// Only `konsumsiProducts` survives, enriched with the new hsCodeId/commoditySubGroupId/
// commodityGroupId/industryGroupId chain resolved from master data by the product's own `hsCode`
// text — it carries real import quantities/pricing worth keeping.
//
// Also migrates the old single-value `countryOfOrigin`/`countryOfOriginCode` fields (pre
// multi-country feature) into the new `originCountries` (code array) / `originCountryNames`
// shape — wraps the one old value into a 1-element array, resolved against active country master
// data by code-or-name. A product that already has `originCountries` is left untouched.
//
// DRY-RUN BY DEFAULT. Prints a full report, writes nothing.
// Pass --write to actually apply (must only be run after explicit user approval).
//
// Run with: npx tsx --env-file=.env scripts/cleanup-konsumsi-legacy-data.mjs
//           npx tsx --env-file=.env scripts/cleanup-konsumsi-legacy-data.mjs --write
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const WRITE_MODE = process.argv.includes("--write");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/**
 * `pg_dump` is not available in this environment (no system Postgres client tools — the dev DB
 * is a local pglite daemon). A full binary/SQL dump isn't needed to make this operation safely
 * reversible: a JSON snapshot of every row this script will touch (the Application rows
 * themselves, plus their ApplicationDocumentVersion history) is sufficient to restore from, and
 * is simpler to verify by eye than a binary dump. Written before any write happens, dry-run or
 * not, so a backup always exists before the write pass even runs.
 */
async function writeBackup(applications, documentVersions) {
  const backupDir = path.resolve("backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `konsumsi-legacy-cleanup-${timestamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ takenAt: new Date().toISOString(), applications, applicationDocumentVersions: documentVersions }, null, 2),
  );
  return backupPath;
}

async function main() {
  const allViuApplications = await db.application.findMany({ where: { verificationType: "VIU" } });
  const konsumsiApplications = allViuApplications.filter((app) => {
    const payload = app.payload;
    return Array.isArray(payload?.importTypes) && payload.importTypes.includes("BARANG_KONSUMSI");
  });

  console.log(`Found ${konsumsiApplications.length} BARANG_KONSUMSI application(s) (all statuses, including DRAFT).`);
  if (konsumsiApplications.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const appIds = konsumsiApplications.map((a) => a.id);
  const documentVersions = await db.applicationDocumentVersion.findMany({ where: { applicationId: { in: appIds } } });
  const backupPath = await writeBackup(konsumsiApplications, documentVersions);
  console.log(`Backup written to: ${backupPath} (${konsumsiApplications.length} application(s), ${documentVersions.length} document version row(s))`);

  const activeHsCodes = await db.hsCodeMasterData.findMany({
    where: { status: "ACTIVE" },
    include: { commodityGroup: { include: { industryGroup: true } }, commoditySubGroup: true, unitOfMeasurement: true },
  });
  const hsByCode = new Map(activeHsCodes.map((row) => [row.hsCode, row]));

  const activeCountries = await db.countryMasterData.findMany({ where: { status: "ACTIVE" } });
  const countryByCodeOrName = new Map();
  for (const country of activeCountries) {
    countryByCodeOrName.set(country.code.trim().toLowerCase(), country);
    countryByCodeOrName.set(country.name.trim().toLowerCase(), country);
  }

  const plans = [];
  const report = [];

  for (const application of konsumsiApplications) {
    const payload = application.payload;
    const hadLegacyQualityTests = Array.isArray(payload.brandQualityTests) && payload.brandQualityTests.length > 0;
    const hadLabelDocs = Boolean(payload.labelStatementDocument?.filePath || payload.labelDocumentationDocument?.filePath);
    const hadCertificates = Array.isArray(payload.productGroupCertificates) && payload.productGroupCertificates.length > 0;

    const products = Array.isArray(payload.konsumsiProducts) ? payload.konsumsiProducts : [];
    const unmatchedProducts = [];
    const unmatchedCountries = [];
    const enrichedProducts = products.map((product) => {
      let countryPatch = {};
      if (!Array.isArray(product.originCountries) || product.originCountries.length === 0) {
        const oldValue = product.countryOfOriginCode || product.countryOfOrigin;
        if (oldValue) {
          const match = countryByCodeOrName.get(String(oldValue).trim().toLowerCase());
          if (match) {
            countryPatch = { originCountries: [match.code], originCountryNames: [match.name] };
          } else {
            unmatchedCountries.push({ productName: product.productName, countryOfOrigin: oldValue });
          }
        }
      }

      const hsRow = hsByCode.get(product.hsCode);
      if (!hsRow) {
        unmatchedProducts.push({ productName: product.productName, hsCode: product.hsCode });
        return { ...product, ...countryPatch }; // HS enrichment skipped — flagged in the report instead
      }
      return {
        ...product,
        ...countryPatch,
        hsCodeId: hsRow.id,
        commoditySubGroupId: hsRow.commoditySubGroupId,
        commoditySubGroupName: hsRow.commoditySubGroup.name,
        commodityGroupId: hsRow.commodityGroupId,
        commodityName: hsRow.commodityGroup.name,
        industryGroupId: hsRow.commodityGroup.industryGroupId ?? "",
        industryName: hsRow.commodityGroup.industryGroup?.name ?? "",
        hsDescription: hsRow.description,
        unit: hsRow.unitOfMeasurement?.symbol ?? hsRow.unitOfMeasurement?.name ?? product.unit ?? "",
      };
    });

    // `status`, `applicationNumber`, `createdAt` (submission date) are never part of this
    // update — only `payload` is touched. Physical files in storage are never deleted; only the
    // payload's own references to them (brandQualityTests entirely, label/cert paths reset to
    // empty) are dropped.
    const { brandQualityTests: _dropped, ...restOfPayload } = payload;
    const newPayload = {
      ...restOfPayload,
      labelStatementDocument: null,
      labelDocumentationDocument: null,
      productGroupCertificates: [],
      konsumsiProducts: enrichedProducts,
    };

    plans.push({ id: application.id, newPayload });
    report.push({
      applicationNumber: application.applicationNumber,
      companyName: payload.companyName ?? "—",
      status: application.status,
      hadLegacyQualityTests,
      hadLabelDocs,
      hadCertificates,
      productsTotal: products.length,
      productsEnriched: products.length - unmatchedProducts.length,
      productsUnmatched: unmatchedProducts,
      countriesUnmatched: unmatchedCountries,
    });
  }

  console.log("\n--- Dry-run report ---");
  for (const entry of report) {
    console.log(`\n${entry.applicationNumber} — ${entry.companyName} (${entry.status})`);
    console.log(`  brandQualityTests akan dihapus: ${entry.hadLegacyQualityTests ? "ya" : "tidak ada"}`);
    console.log(`  labelStatementDocument/labelDocumentationDocument akan di-null-kan: ${entry.hadLabelDocs ? "ya (ada data)" : "tidak ada data"}`);
    console.log(`  productGroupCertificates akan dikosongkan: ${entry.hadCertificates ? "ya (ada data)" : "tidak ada data"}`);
    console.log(`  konsumsiProducts: ${entry.productsEnriched}/${entry.productsTotal} dilengkapi hsCodeId dari master`);
    if (entry.productsUnmatched.length > 0) {
      console.log(`  ⚠ ${entry.productsUnmatched.length} produk dengan HS Code tidak ditemukan/tidak aktif:`);
      for (const p of entry.productsUnmatched) {
        console.log(`     - "${p.productName}" (HS Code: "${p.hsCode}")`);
      }
    }
    if (entry.countriesUnmatched.length > 0) {
      console.log(`  ⚠ ${entry.countriesUnmatched.length} produk dengan Asal Negara (lama) tidak ditemukan di master data — originCountries TIDAK dimigrasikan:`);
      for (const p of entry.countriesUnmatched) {
        console.log(`     - "${p.productName}" (Asal Negara: "${p.countryOfOrigin}")`);
      }
    }
  }

  if (!WRITE_MODE) {
    console.log("\nDry run only — no writes made. Re-run with --write to apply (after explicit approval).");
    return;
  }

  console.log("\nApplying changes...");
  for (const plan of plans) {
    await db.application.update({ where: { id: plan.id }, data: { payload: plan.newPayload } });
  }
  console.log(`Cleanup applied to ${plans.length} application(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
