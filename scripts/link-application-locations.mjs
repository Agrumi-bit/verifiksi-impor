// Links the locations stored in old applications (Application.payload.locations) to the
// company profile (Company.locations), for the "lokasi permohonan dipilih dari lokasi
// perusahaan" feature. DRY-RUN BY DEFAULT — prints what it would change and writes nothing.
//
// For every application:
//   1. Each payload location is matched to a Company.locations entry — by id (companyLocationId
//      or the entry's own id, which the wizard copied from the profile), else by locationType +
//      normalized address. A match gets `companyLocationId` + `capturedAt` (the application's
//      last write); the location data itself is left as submitted — it stays the snapshot.
//   2. Payload locations with no profile match are reported. With --create-missing they are
//      also appended to Company.locations (source APPLICATION, "Dari permohonan") and linked.
//   3. Applications missing a required location type (VIU: KANTOR+GUDANG, VKI: KANTOR+PABRIK)
//      that the company profile does have are reported — never added automatically.
// Company locations are never removed or edited. Application.updatedAt is left untouched.
//
// Dry-run:  npx tsx --env-file=.env scripts/link-application-locations.mjs
// Write:    npx tsx --env-file=.env scripts/link-application-locations.mjs --apply [--create-missing]
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const APPLY = process.argv.includes("--apply");
const CREATE_MISSING = process.argv.includes("--create-missing");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const requiredTypes = (verificationType) => (verificationType === "VKI" ? ["KANTOR", "PABRIK"] : ["KANTOR", "GUDANG"]);

const normalizeAddress = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[.,;:/\\()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const describe = (loc) => `${loc.locationType ?? "?"} — ${loc.address ?? "(tanpa alamat)"}`;

function findCompanyLocation(loc, companyLocations) {
  const byId = companyLocations.find((c) => c.id === (loc.companyLocationId || loc.id));
  if (byId) return { match: byId, by: "id" };
  const address = normalizeAddress(loc.address);
  const byAddress = address
    ? companyLocations.find((c) => c.locationType === loc.locationType && normalizeAddress(c.address) === address)
    : undefined;
  return byAddress ? { match: byAddress, by: "alamat" } : null;
}

async function main() {
  console.log(APPLY ? "MODE: TULIS (--apply)" : "MODE: DRY-RUN (tidak ada yang ditulis)");
  if (CREATE_MISSING) console.log("Opsi --create-missing: lokasi permohonan yang tidak ada di profil akan dibuat di profil perusahaan.");
  console.log("");

  const applications = await db.application.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, applicationNumber: true, status: true, payload: true, updatedAt: true, companyId: true },
  });
  const companies = new Map(
    (await db.company.findMany({ select: { id: true, companyName: true, locations: true } })).map((c) => [
      c.id,
      { ...c, locations: Array.isArray(c.locations) ? [...c.locations] : [] },
    ]),
  );
  const touchedCompanies = new Set();

  const totals = { applications: 0, locations: 0, alreadyLinked: 0, linkedById: 0, linkedByAddress: 0, missing: 0, created: 0, appsChanged: 0 };
  const missingReport = [];
  const requiredReport = [];

  for (const application of applications) {
    const payload = application.payload && typeof application.payload === "object" ? application.payload : null;
    const companyId = application.companyId ?? payload?.companyId;
    const company = companyId ? companies.get(companyId) : undefined;
    if (!payload || !Array.isArray(payload.locations) || !company) continue;
    totals.applications += 1;

    const capturedAt = application.updatedAt.toISOString();
    let changed = false;
    const locations = payload.locations.map((loc) => {
      totals.locations += 1;
      const found = findCompanyLocation(loc, company.locations);
      if (found) {
        if (loc.companyLocationId === found.match.id) {
          totals.alreadyLinked += 1;
          return loc;
        }
        if (found.by === "id") totals.linkedById += 1;
        else totals.linkedByAddress += 1;
        changed = true;
        return { ...loc, companyLocationId: found.match.id, capturedAt: loc.capturedAt ?? capturedAt };
      }

      totals.missing += 1;
      missingReport.push({ application, company, loc });
      if (!CREATE_MISSING) return loc;

      // "Dari permohonan": add it to the profile, keeping its id unless that id is taken.
      const id = company.locations.some((c) => c.id === loc.id) || !loc.id ? randomUUID() : loc.id;
      const data = { ...loc };
      delete data.companyLocationId;
      delete data.capturedAt;
      company.locations.push({ ...data, id, source: "APPLICATION", sourceApplicationId: application.id });
      touchedCompanies.add(company.id);
      totals.created += 1;
      changed = true;
      return { ...loc, companyLocationId: id, capturedAt: loc.capturedAt ?? capturedAt };
    });

    const verificationType = payload.verificationType;
    if (application.status !== "DRAFT" && (verificationType === "VIU" || verificationType === "VKI")) {
      const present = new Set(locations.map((l) => l.locationType));
      const missingTypes = requiredTypes(verificationType).filter((t) => !present.has(t));
      if (missingTypes.length > 0) {
        requiredReport.push({
          application,
          company,
          missing: missingTypes.map((type) => ({ type, available: company.locations.filter((c) => c.locationType === type) })),
        });
      }
    }

    if (!changed) continue;
    totals.appsChanged += 1;
    if (APPLY) {
      // Raw UPDATE so Application.updatedAt (@updatedAt) keeps meaning "last real change".
      await db.$executeRaw`UPDATE "application" SET "payload" = ${JSON.stringify({ ...payload, locations })}::jsonb WHERE "id" = ${application.id}`;
    }
  }

  if (APPLY) {
    for (const companyId of touchedCompanies) {
      const company = companies.get(companyId);
      await db.company.update({ where: { id: companyId }, data: { locations: company.locations } });
    }
  }

  console.log("=== 1. Penautan lokasi permohonan ke profil perusahaan ===");
  const will = (done, todo) => (APPLY ? done : todo);
  const row = (label, value) => console.log(`${label.padEnd(38)}: ${value}`);
  row("Permohonan diperiksa", totals.applications);
  row("Lokasi permohonan diperiksa", totals.locations);
  row("  sudah tertaut", totals.alreadyLinked);
  row(`  ${will("ditautkan", "akan ditautkan")} (cocok id)`, totals.linkedById);
  row(`  ${will("ditautkan", "akan ditautkan")} (cocok jenis+alamat)`, totals.linkedByAddress);
  row("  tidak ada di profil", totals.missing);
  if (CREATE_MISSING) row(`  ${will("dibuat", "akan dibuat")} di profil`, totals.created);
  row(`Permohonan ${will("diubah", "yang akan diubah")}`, totals.appsChanged);
  console.log("");

  console.log("=== 2. Lokasi di permohonan yang TIDAK ada di profil perusahaan ===");
  if (missingReport.length === 0) console.log("(tidak ada)");
  for (const { application, company, loc } of missingReport) {
    console.log(`${application.applicationNumber} (${application.status}) — ${company.companyName}`);
    console.log(`  ${describe(loc)}  [id=${loc.id}]`);
  }
  if (missingReport.length > 0 && !CREATE_MISSING) {
    console.log("→ Opsi: jalankan dengan --create-missing untuk membuatnya di profil perusahaan (sumber \"Dari permohonan\").");
  }
  console.log("");

  console.log("=== 3. Permohonan tanpa lokasi wajib yang SEBENARNYA ada di profil perusahaan ===");
  const fixable = requiredReport.filter((r) => r.missing.some((m) => m.available.length > 0));
  const unfixable = requiredReport.filter((r) => r.missing.every((m) => m.available.length === 0));
  if (fixable.length === 0) console.log("(tidak ada)");
  for (const { application, company, missing } of fixable) {
    console.log(`${application.applicationNumber} (${application.status}) — ${company.companyName}`);
    for (const m of missing) {
      if (m.available.length === 0) console.log(`  ${m.type}: tidak ada di profil juga`);
      for (const loc of m.available) console.log(`  ${m.type} tersedia di profil → ${loc.id}  ${loc.address}`);
    }
  }
  console.log("→ Tidak diubah otomatis: perbaiki lewat Edit Permohonan (Admin) atau minta revisi ke perusahaan.");
  if (unfixable.length > 0) {
    console.log("");
    console.log("Permohonan tanpa lokasi wajib yang juga TIDAK ada di profil perusahaan:");
    for (const { application, company, missing } of unfixable) {
      console.log(`  ${application.applicationNumber} (${application.status}) — ${company.companyName}: ${missing.map((m) => m.type).join(", ")}`);
    }
  }
  console.log("");
  console.log(APPLY ? "Selesai — perubahan sudah ditulis." : "DRY-RUN selesai — tidak ada yang ditulis. Tulis hanya setelah disetujui: tambahkan --apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
