// Seed 5 sample companies for manual/local testing: 3 API-U, 2 API-P.
// Validates each through companyWizardSchema (same schema the real wizard
// submits through) before inserting, so seeded rows always match the shape
// the app expects.
//
// Run with: npx tsx --env-file=.env scripts/seed-sample-companies.mjs
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { companyWizardSchema } from "../src/modules/company/schema.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function company({ apiType, companyName, nibNumber, npwpNumber }) {
  return {
    apiType,
    companyName,
    companyType: "PT",
    investmentStatus: "PMDN",
    companyEmail: `info@${nibNumber.toLowerCase()}.example.com`,
    companyPhone: "0211234567",
    contacts: [
      {
        name: "Budi Santoso",
        jabatan: "Direktur",
        whatsapp: "081234567890",
        email: `budi@${nibNumber.toLowerCase()}.example.com`,
      },
    ],
    addressJalan: "Jl. Industri Raya No. 1",
    addressDesa: "Cibodas",
    addressKecamatan: "Cibodas",
    addressKota: "Tangerang",
    addressProvinsi: "Banten",
    addressKodePos: "15138",
    nibNumber,
    nibIssueDate: "2023-01-10",
    nibDocumentPath: "documents/seed/nib.pdf",
    kbliEntries: [{ code: "46100", description: "Perdagangan besar", category: "UTAMA" }],
    kbliDocumentPath: "documents/seed/kbli.pdf",
    notarialDeedNumber: "12",
    notarialDeedIssueDate: "2020-05-01",
    notarialIssuingAuthority: "Notaris Seed",
    notarialDocumentPath: "documents/seed/akta.pdf",
    hasAmendment: false,
    skNumber: "SK-0001",
    skDate: "2020-05-02",
    skDocumentPath: "documents/seed/sk.pdf",
    npwpNumber,
    npwpIssuer: "KPP Seed",
    npwpDocumentPath: "documents/seed/npwp.pdf",
    companyAge: apiType === "API-U" ? "OVER_3" : undefined,
    taxProofs: [],
    locations: [
      {
        id: "loc-1",
        locationType: "KANTOR",
        address: "Jl. Industri Raya No. 1",
        addressDesa: "Cibodas",
        addressKecamatan: "Cibodas",
        city: "Tangerang",
        province: "Banten",
        country: "Indonesia",
        postalCode: "15138",
        buildingStatus: "MILIK_SENDIRI",
        ownershipDocuments: [{ type: "SHM", documentPath: "documents/seed/shm.pdf" }],
        leaseDocuments: [],
      },
    ],
  };
}

const samples = [
  { apiType: "API-U", companyName: "PT Umum Sejahtera Satu", nibNumber: "SEED-APIU-001", npwpNumber: "01.111.001.1-001.000" },
  { apiType: "API-U", companyName: "PT Umum Sejahtera Dua", nibNumber: "SEED-APIU-002", npwpNumber: "01.111.002.1-001.000" },
  { apiType: "API-U", companyName: "PT Umum Sejahtera Tiga", nibNumber: "SEED-APIU-003", npwpNumber: "01.111.003.1-001.000" },
  { apiType: "API-P", companyName: "PT Produsen Makmur Satu", nibNumber: "SEED-APIP-001", npwpNumber: "01.222.001.1-001.000" },
  { apiType: "API-P", companyName: "PT Produsen Makmur Dua", nibNumber: "SEED-APIP-002", npwpNumber: "01.222.002.1-001.000" },
];

for (const sample of samples) {
  const raw = company(sample);
  const parsed = companyWizardSchema.parse(raw);
  const firstContact = parsed.contacts[0];

  const existing = await db.company.findUnique({ where: { nibNumber: parsed.nibNumber } });
  if (existing) {
    console.log(`SKIP (already exists): ${parsed.companyName} (${parsed.nibNumber})`);
    continue;
  }

  const created = await db.company.create({
    data: {
      apiType: parsed.apiType,
      companyName: parsed.companyName,
      companyType: parsed.companyType,
      investmentStatus: parsed.investmentStatus,
      companyEmail: parsed.companyEmail,
      companyPhone: parsed.companyPhone,
      contactFullName: firstContact.name,
      contactDesignation: firstContact.jabatan,
      contactEmail: firstContact.email,
      contactPhone: firstContact.whatsapp,
      contacts: parsed.contacts,
      addressJalan: parsed.addressJalan,
      addressDesa: parsed.addressDesa,
      addressKecamatan: parsed.addressKecamatan,
      addressKota: parsed.addressKota,
      addressProvinsi: parsed.addressProvinsi,
      addressKodePos: parsed.addressKodePos,
      nibNumber: parsed.nibNumber,
      nibIssueDate: new Date(parsed.nibIssueDate),
      nibDocumentPath: parsed.nibDocumentPath,
      kbliEntries: parsed.kbliEntries,
      kbliDocumentPath: parsed.kbliDocumentPath,
      notarialDeedNumber: parsed.notarialDeedNumber,
      notarialDeedIssueDate: new Date(parsed.notarialDeedIssueDate),
      notarialIssuingAuthority: parsed.notarialIssuingAuthority,
      notarialDocumentPath: parsed.notarialDocumentPath,
      skNumber: parsed.skNumber,
      skDate: new Date(parsed.skDate),
      skDocumentPath: parsed.skDocumentPath,
      npwpNumber: parsed.npwpNumber,
      npwpIssuer: parsed.npwpIssuer,
      npwpDocumentPath: parsed.npwpDocumentPath,
      companyAge: parsed.companyAge,
      taxProofs: parsed.taxProofs,
      locations: parsed.locations,
    },
  });
  console.log(`CREATED: ${created.companyName} (${created.apiType}) — ${created.id}`);
}

await db.$disconnect();
