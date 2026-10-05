// Read-only audit for the new "Lokasi wajib" business rule (Step 5 "Location Information"):
// VIU needs at least one KANTOR + one GUDANG location; VKI needs at least one KANTOR + one
// PABRIK location. The rule is NOT retroactive (see applyRequiredLocationsRule in
// src/modules/applications/schema.ts) — this script never writes anything, it only reports
// which non-draft applications are missing a required location type in their submitted
// payload, and whether that type is available on the live Company record (so a human can
// decide whether/how to backfill).
//
// Run with: npx tsx --env-file=.env scripts/check-required-locations.mjs
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function getRequiredLocationTypes(verificationType) {
  return verificationType === "VKI" ? ["KANTOR", "PABRIK"] : ["KANTOR", "GUDANG"];
}

function missingRequiredLocationTypes(locations, verificationType) {
  const present = new Set((locations ?? []).map((l) => l.locationType));
  return getRequiredLocationTypes(verificationType).filter((t) => !present.has(t));
}

async function main() {
  const applications = await db.application.findMany({
    where: { status: { not: "DRAFT" } },
    include: { company: true },
  });

  const report = [];
  for (const application of applications) {
    const payload = application.payload;
    const verificationType = payload?.verificationType;
    if (verificationType !== "VIU" && verificationType !== "VKI") continue;

    const missing = missingRequiredLocationTypes(payload.locations, verificationType);
    if (missing.length === 0) continue;

    const companyLocations = application.company?.locations ?? [];
    const missingDetail = missing.map((type) => {
      const availableInCompany = companyLocations.filter((l) => l.locationType === type);
      return {
        type,
        availableInCompany: availableInCompany.map((l) => ({ id: l.id, address: l.address })),
      };
    });

    report.push({
      applicationNumber: application.applicationNumber,
      companyName: application.company?.companyName ?? payload.companyName ?? "—",
      verificationType,
      status: application.status,
      missing: missingDetail,
    });
  }

  console.log(`Checked ${applications.length} non-draft application(s).`);
  console.log(`${report.length} application(s) missing a required location type.\n`);

  for (const entry of report) {
    console.log(`${entry.applicationNumber} — ${entry.companyName} (${entry.verificationType}, ${entry.status})`);
    for (const m of entry.missing) {
      if (m.availableInCompany.length > 0) {
        console.log(`  Missing ${m.type} — AVAILABLE in Company.locations:`);
        for (const loc of m.availableInCompany) {
          console.log(`    - id=${loc.id}  ${loc.address}`);
        }
      } else {
        console.log(`  Missing ${m.type} — NOT available in Company.locations either (company has no ${m.type} at all).`);
      }
    }
    console.log("");
  }

  // Specific case called out in this audit's ticket — preview only, never written.
  const target = report.find((entry) => entry.applicationNumber === "APP-VIU-20261004-7CEA9276");
  if (target) {
    console.log("--- Remediation preview for APP-VIU-20261004-7CEA9276 (DRY-RUN, not applied) ---");
    for (const m of target.missing) {
      for (const loc of m.availableInCompany) {
        console.log(
          `Would append this Company.locations[${m.type}] entry (id=${loc.id}) into this application's payload.locations:`,
        );
        console.log(JSON.stringify(loc, null, 2));
      }
    }
    console.log("No write performed — re-run is still read-only. Apply only after explicit approval.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
