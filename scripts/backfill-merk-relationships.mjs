// One-time backfill: run syncMerkRelationshipsForApplication's own logic against every
// existing non-DRAFT application, so MerkImporter catches up on relationships that were
// never synced before this feature existed. Idempotent — safe to re-run.
//
// DRY-RUN BY DEFAULT. Prints every planned create/update/delete, writes nothing.
// Pass --write to actually apply (must only be run after explicit user approval).
//
// Run with: npx tsx --env-file=.env scripts/backfill-merk-relationships.mjs
//           npx tsx --env-file=.env scripts/backfill-merk-relationships.mjs --write
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { resolveKonsumsiBrandContexts } from "../src/modules/verifikator-workspace/konsumsi-brand-context.ts";

const WRITE_MODE = process.argv.includes("--write");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function planForApplication(application) {
  const payload = application.payload;
  const applicationBrands = payload?.applicationBrands ?? [];
  if (!application.companyId || applicationBrands.length === 0) return [];

  const brandContexts = await resolveKonsumsiBrandContexts(applicationBrands);
  const contextByBrandId = new Map(brandContexts.map((c) => [c.brandId, c]));

  const existingRows = await db.merkImporter.findMany({
    where: { sourceApplicationId: application.id, sourceType: "APPLICATION" },
  });
  const existingByMerkId = new Map(existingRows.map((row) => [row.merkId, row]));

  const plans = [];
  for (const entry of applicationBrands) {
    const context = contextByBrandId.get(entry.brandId);
    const requiredCode = context?.requiredRelationshipDocuments[0]?.code;
    const document = requiredCode ? entry.relationshipDocuments?.[requiredCode] : undefined;
    const existing = existingByMerkId.get(entry.brandId);

    const desired = {
      merkId: entry.brandId,
      companyId: application.companyId,
      companyName: payload.companyName,
      role: entry.applicantRole,
      appointmentSource: entry.appointmentSource ?? null,
      authorizationDocumentPath: document?.filePath ?? null,
      authorizationDocumentName: document?.fileName ?? null,
      sourceType: "APPLICATION",
      sourceApplicationId: application.id,
    };

    if (!existing) {
      plans.push({ action: "create", applicationNumber: application.applicationNumber, data: desired });
    } else {
      const changed =
        existing.companyName !== desired.companyName ||
        existing.role !== desired.role ||
        existing.appointmentSource !== desired.appointmentSource ||
        existing.authorizationDocumentPath !== desired.authorizationDocumentPath ||
        existing.authorizationDocumentName !== desired.authorizationDocumentName;
      if (changed) {
        plans.push({ action: "update", applicationNumber: application.applicationNumber, data: desired, id: existing.id });
      }
    }
  }

  const desiredBrandIds = new Set(applicationBrands.map((entry) => entry.brandId));
  for (const row of existingRows) {
    if (!desiredBrandIds.has(row.merkId)) {
      plans.push({ action: "delete", applicationNumber: application.applicationNumber, id: row.id, merkId: row.merkId });
    }
  }

  return plans;
}

async function main() {
  const applications = await db.application.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Scanning ${applications.length} non-DRAFT applications...`);

  const allPlans = [];
  for (const application of applications) {
    const plans = await planForApplication(application);
    allPlans.push(...plans);
  }

  if (allPlans.length === 0) {
    console.log("Nothing to backfill — all MerkImporter rows already in sync.");
    return;
  }

  console.log(`\n${allPlans.length} planned change(s):\n`);
  for (const plan of allPlans) {
    if (plan.action === "delete") {
      console.log(`[DELETE] app ${plan.applicationNumber} — stale row id=${plan.id} merkId=${plan.merkId}`);
    } else {
      console.log(
        `[${plan.action.toUpperCase()}] app ${plan.applicationNumber} — merkId=${plan.data.merkId} company="${plan.data.companyName}" role=${plan.data.role} appointmentSource=${plan.data.appointmentSource} doc=${plan.data.authorizationDocumentName ?? "(none)"}`,
      );
    }
  }

  if (!WRITE_MODE) {
    console.log("\nDry run only — no writes made. Re-run with --write to apply.");
    return;
  }

  console.log("\nApplying changes...");
  await db.$transaction(async (tx) => {
    for (const plan of allPlans) {
      if (plan.action === "create") {
        await tx.merkImporter.create({ data: plan.data });
      } else if (plan.action === "update") {
        await tx.merkImporter.update({ where: { id: plan.id }, data: plan.data });
      } else if (plan.action === "delete") {
        await tx.merkImporter.delete({ where: { id: plan.id } });
      }
    }
  });
  console.log("Backfill applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
