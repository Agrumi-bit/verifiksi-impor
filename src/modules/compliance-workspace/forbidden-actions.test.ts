import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Guard rail for the Compliance Workspace's scope (docs/handoff/HANDOFF.md, "Aturan Compliance
 * Workspace"): it only monitors, consolidates, traces, reviews and audits. Scans every file of the
 * workspace — pages, API routes and module — so a forbidden action can't slip in unnoticed.
 */

const ROOT = process.cwd();
const SCANNED_DIRS = ["src/app/compliance-workspace", "src/app/api/compliance-workspace", "src/modules/compliance-workspace"];

/** The only tables Compliance may write: its own, plus the shared append-only audit log. */
const WRITABLE_MODELS = new Set(["complianceCase", "complianceIssue", "complianceIssueFollowUp", "applicationAuditLog"]);
const WRITABLE_TABLES = /^"?(compliance_case|compliance_issue|compliance_issue_follow_up|application_audit_log)"?$/i;

/** Visible action labels the workspace must never offer. */
const FORBIDDEN_LABELS = [
  "Buat Permohonan",
  "Buat Case",
  "Edit Permohonan",
  "Upload Ulang",
  "Unggah Ulang",
  "Generate LHVIU",
  "Approve LHVIU",
  "Publish LHVIU",
  "Terbitkan LHVIU",
  "Hapus Case",
  "Hapus Permohonan",
  "Delete Case",
];

function listFiles(dir: string): string[] {
  const absolute = path.join(ROOT, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const full = path.join(absolute, name);
    if (statSync(full).isDirectory()) return listFiles(path.join(dir, name));
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = SCANNED_DIRS.flatMap(listFiles).map((file) => ({ file: path.relative(ROOT, file), source: readFileSync(file, "utf8") }));

describe("Compliance Workspace scope", () => {
  it("scans the workspace's files", () => {
    assert.ok(files.length > 0);
  });

  it("writes only its own tables through Prisma", () => {
    const offending = files.flatMap(({ file, source }) =>
      [...source.matchAll(/\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g)]
        .filter((match) => !WRITABLE_MODELS.has(match[1]))
        .map((match) => `${file}: ${match[1]}.${match[2]}`),
    );
    assert.deepEqual(offending, []);
  });

  it("writes only its own tables through raw SQL", () => {
    const offending = files.flatMap(({ file, source }) =>
      [...source.matchAll(/\b(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+("?\w+"?)/gi)]
        .filter((match) => !WRITABLE_TABLES.test(match[1]))
        .map((match) => `${file}: ${match[0]}`),
    );
    assert.deepEqual(offending, []);
  });

  it("exposes no DELETE endpoint", () => {
    const offending = files
      .filter(({ file, source }) => file.includes(`api${path.sep}compliance-workspace`) && /export\s+(async\s+)?function\s+DELETE\b/.test(source))
      .map(({ file }) => file);
    assert.deepEqual(offending, []);
  });

  it("offers no forbidden action", () => {
    const offending = files.flatMap(({ file, source }) =>
      FORBIDDEN_LABELS.filter((label) => source.toLowerCase().includes(label.toLowerCase())).map((label) => `${file}: "${label}"`),
    );
    assert.deepEqual(offending, []);
  });
});
