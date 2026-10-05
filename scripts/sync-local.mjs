// Brings a local checkout up to date with `main` in one command: pulls the latest code,
// installs dependencies, applies new Prisma migrations to the local database, regenerates the
// Prisma client, and seeds the reference data (regions, countries, trademark classes).
//
// Run with: npm run sync:local
//
// Safe to re-run: it refuses to pull over uncommitted changes, and every seed script skips data
// that is already there (seed-regions skips a non-empty table; countries and trademark classes
// use skipDuplicates), so nothing added or edited locally is overwritten. It only syncs code and
// database structure — business data (companies, applications, brands, users) stays as it is.
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";

const BRANCH = "main";

function run(command, { allowFailure = false } = {}) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch {
    if (allowFailure) return false;
    console.error(`\n✗ Gagal menjalankan: ${command}`);
    process.exit(1);
  }
}

function output(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

if (!existsSync(".env")) {
  console.error("✗ File .env tidak ditemukan. Salin .env.example menjadi .env dan isi DATABASE_URL terlebih dahulu.");
  process.exit(1);
}

console.log("== 1/5 Cek perubahan lokal");
if (output("git status --porcelain")) {
  console.error(
    "✗ Ada perubahan lokal yang belum di-commit. Commit atau simpan dulu (git stash), lalu jalankan ulang.\n",
  );
  run("git status --short");
  process.exit(1);
}

console.log(`\n== 2/5 Ambil kode terbaru dari ${BRANCH}`);
const currentBranch = output("git rev-parse --abbrev-ref HEAD");
if (currentBranch !== BRANCH) run(`git checkout ${BRANCH}`);
run(`git pull origin ${BRANCH}`);

console.log("\n== 3/5 Install dependency");
run("npm install");

console.log("\n== 4/5 Database: migrasi + Prisma client");
// Same local database `npm run dev` starts via its predev hook. Harmless when it's already
// running, and when DATABASE_URL points at another Postgres it simply isn't used.
run("npx prisma dev start default", { allowFailure: true });
run("npx prisma migrate deploy");
run("npx prisma generate");

console.log("\n== 5/5 Data referensi (dilewati bila sudah ada)");
run("npx tsx --env-file=.env scripts/seed-regions.mjs");
run("npx tsx --env-file=.env scripts/seed-countries.mjs");
run("npx tsx --env-file=.env scripts/seed-trademark-classes.mjs");

// execFileSync (no shell) so `%h %s` isn't mangled by Windows cmd's %VAR% expansion.
const lastCommit = execFileSync("git", ["log", "-1", "--format=%h %s"], { encoding: "utf8" }).trim();
console.log(`\n✓ Lokal sudah sama dengan ${BRANCH} (${lastCommit}).`);
console.log("  Jalankan aplikasi dengan: npm run dev");
