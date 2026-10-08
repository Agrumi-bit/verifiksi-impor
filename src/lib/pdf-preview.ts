import "server-only";

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { storage } from "@/lib/storage";
import { STORAGE_ROOT } from "@/lib/storage/local-storage";

/**
 * Compressed *viewing* copies of large PDFs.
 *
 * Scanned PDFs are mostly full-resolution page images, so over a slow link the in-app viewer waits
 * for megabytes it doesn't need. Ghostscript re-encodes them with images downsampled to ~150 dpi
 * (`/ebook`), usually 50–80% smaller and still sharp on screen. The ORIGINAL is never touched —
 * downloads / "Buka di tab baru" keep serving the uploaded file (digital signatures stay valid);
 * only the in-app viewer asks for `variant=preview`.
 *
 * Previews live at `previews/<sha1(path|size|mtime)>.pdf`, so a replaced file never reuses a stale
 * preview. A `.skip` marker records files that didn't shrink enough (or failed) so they aren't
 * retried. Generation is serialized (the VPS has one CPU) and runs at low priority.
 */

/** Below this the original is already quick enough to fetch. */
const MIN_SIZE_BYTES = 500 * 1024;
/** Keep the preview only when it saves at least this fraction. */
const MAX_RATIO = 0.85;
const GS_TIMEOUT_MS = 180_000;

const inFlight = new Set<string>();
const queue: Array<{ source: string; previewKey: string }> = [];
let running = false;
let ghostscriptMissing = false;

function previewKeyFor(source: string, size: number, mtimeMs: number) {
  return createHash("sha1").update(`${source}|${size}|${Math.round(mtimeMs)}`).digest("hex");
}

function isPdf(p: string) {
  return p.toLowerCase().endsWith(".pdf");
}

/**
 * Returns the storage path of a ready preview for `source`, or null when the original should be
 * served (small file, not a PDF, preview still generating, or not worth it). When no preview exists
 * yet it is queued in the background, so the next view gets it.
 */
export async function resolvePdfPreview(source: string): Promise<string | null> {
  if (!isPdf(source) || source.startsWith("previews/")) return null;
  let info;
  try {
    info = await storage.stat(source);
  } catch {
    return null;
  }
  if (info.size < MIN_SIZE_BYTES) return null;

  const key = previewKeyFor(source, info.size, info.mtimeMs);
  const previewPath = `previews/${key}.pdf`;
  if (await storage.exists(previewPath)) return previewPath;
  if (await storage.exists(`previews/${key}.skip`)) return null;

  enqueue(source, key);
  return null;
}

/** Fire-and-forget: queue a preview for a just-uploaded / existing file. */
export function schedulePdfPreview(source: string) {
  void resolvePdfPreview(source).catch(() => undefined);
}

function enqueue(source: string, previewKey: string) {
  if (ghostscriptMissing || inFlight.has(previewKey)) return;
  inFlight.add(previewKey);
  queue.push({ source, previewKey });
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await generate(job.source, job.previewKey);
      } catch (error) {
        console.error("[pdf-preview] failed", job.source, error);
      } finally {
        inFlight.delete(job.previewKey);
      }
    }
  } finally {
    running = false;
  }
}

async function generate(source: string, previewKey: string) {
  if (ghostscriptMissing) return;
  const work = await mkdtemp(path.join(tmpdir(), "pdfprev-"));
  try {
    const input = path.join(work, "in.pdf");
    const output = path.join(work, "out.pdf");
    const original = await storage.read(source);
    await writeFile(input, original);

    const ok = await runGhostscript(input, output);
    if (ok === "missing") {
      ghostscriptMissing = true;
      console.warn("[pdf-preview] ghostscript (gs) not installed — previews disabled");
      return;
    }
    if (!ok) {
      await storage.save("previews", `${previewKey}.skip`, Buffer.from("failed"));
      return;
    }
    const compressed = await readFile(output);
    if (compressed.length === 0 || compressed.length > original.length * MAX_RATIO) {
      await storage.save("previews", `${previewKey}.skip`, Buffer.from(`no-gain ${compressed.length}/${original.length}`));
      return;
    }
    await storage.save("previews", `${previewKey}.pdf`, compressed);
    console.info(`[pdf-preview] ${source}: ${original.length} → ${compressed.length} bytes`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

function runGhostscript(input: string, output: string): Promise<boolean | "missing"> {
  const args = [
    "-n", "15", "gs",
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.5",
    "-dPDFSETTINGS=/ebook",
    // Linearized ("Fast Web View"): page 1's objects sit at the front of the file, so the viewer's
    // range requests can show it before the rest of the document has downloaded.
    "-dFastWebView=true",
    "-dDetectDuplicateImages=true",
    "-dDownsampleColorImages=true",
    "-dColorImageResolution=150",
    "-dDownsampleGrayImages=true",
    "-dGrayImageResolution=150",
    "-dDownsampleMonoImages=true",
    "-dMonoImageResolution=300",
    "-dNOPAUSE", "-dBATCH", "-dQUIET", "-dSAFER",
    `-sOutputFile=${output}`,
    input,
  ];
  return new Promise((resolve) => {
    const child = spawn("nice", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      if (stderr.length < 2000) stderr += String(chunk);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), GS_TIMEOUT_MS);
    child.on("error", () => {
      clearTimeout(timer);
      resolve("missing");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // `nice` exits 127 when it can't find `gs`.
      if (code === 127) return resolve("missing");
      if (code !== 0) console.warn("[pdf-preview] gs exit", code, stderr.slice(0, 500));
      resolve(code === 0);
    });
  });
}

/**
 * One-off sweep (run after server start): queues previews for every existing large PDF that
 * doesn't have one yet. Cheap when everything is already done — just stat() calls.
 */
export async function sweepPdfPreviews() {
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(STORAGE_ROOT, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (rel === "previews") continue;
        await walk(full);
      } else if (entry.isFile() && isPdf(entry.name)) {
        const info = await stat(full).catch(() => null);
        if (info && info.size >= MIN_SIZE_BYTES) await resolvePdfPreview(rel);
        if (ghostscriptMissing) return;
      }
    }
  }
  await walk(STORAGE_ROOT);
}
