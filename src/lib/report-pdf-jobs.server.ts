import "server-only";

import { randomUUID } from "node:crypto";

import { renderAppPageToPdf, type RenderProgress } from "@/lib/html-to-pdf.server";

/**
 * "Unduh PDF" as a background job, so the browser can show real progress (percent) instead of a
 * spinner: POST starts the server-side print, GET polls its progress, then the file is fetched once.
 * Jobs live in this Node process's memory (one app container) and expire after 10 minutes.
 */
export type ReportPdfJobStatus = "queued" | "starting" | "loading" | "printing" | "done" | "error";

type Job = {
  id: string;
  userId: string;
  name: string;
  status: ReportPdfJobStatus;
  percent: number;
  detail: string;
  pdf?: Buffer;
  error?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();
const TTL_MS = 10 * 60 * 1000;

/** Report pages "Unduh PDF" may print: workspace report / document-report / technical-report / LHVIU pages. */
export const REPORT_PAGE =
  /^\/(verifikator-workspace|project-manager-workspace|technical-analyst-workspace|company-workspace|surveyor-workspace)\/[A-Za-z0-9/_-]*(report|lhviu)[A-Za-z0-9/_-]*(\?[A-Za-z0-9=&%._~+-]*)?$/;

const PENDING_PATTERN = "Memuat laporan|Memuat\\.\\.\\.|Memuat dokumen PDF|Memuat Laporan|Menyusun halaman A4";

function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) if (now - job.createdAt > TTL_MS) jobs.delete(id);
}

function apply(job: Job, p: RenderProgress) {
  if (p.phase === "queued") Object.assign(job, { status: "queued", percent: 0, detail: "Menunggu antrean" });
  else if (p.phase === "starting") Object.assign(job, { status: "starting", percent: 3, detail: "Membuka laporan" });
  else if (p.phase === "printing") Object.assign(job, { status: "printing", percent: 92, detail: "Membuat file PDF" });
  else {
    // Loading: 5% → 90% by images loaded; while parts are still fetching their data, stay low.
    const ratio = p.imagesTotal > 0 ? p.imagesDone / p.imagesTotal : 0;
    const percent = Math.round(5 + (p.waitingForContent ? Math.min(ratio, 0.3) : ratio) * 85);
    Object.assign(job, {
      status: "loading",
      percent: Math.max(job.percent, Math.min(percent, 90)),
      detail: p.imagesTotal > 0 ? `Memuat gambar ${p.imagesDone}/${p.imagesTotal}` : "Memuat isi laporan",
    });
  }
}

export function startReportPdfJob({ userId, page, name, cookie }: { userId: string; page: string; name: string; cookie: string }): Job {
  sweep();
  const job: Job = { id: randomUUID(), userId, name, status: "queued", percent: 0, detail: "Menunggu antrean", createdAt: Date.now() };
  jobs.set(job.id, job);
  renderAppPageToPdf(page, {
    cookie,
    readySelector: ".report-doc section.rd-sheet",
    errorText: "Laporan tidak ditemukan",
    pendingPattern: PENDING_PATTERN,
    onProgress: (p) => apply(job, p),
  })
    .then((pdf) => Object.assign(job, { status: "done", percent: 100, detail: "Selesai", pdf }))
    .catch((e: unknown) => {
      console.error("[report pdf job]", page, e);
      Object.assign(job, { status: "error", detail: "PDF gagal dibuat", error: e instanceof Error ? e.message : String(e) });
    });
  return job;
}

export function getReportPdfJob(id: string, userId: string): Job | null {
  const job = jobs.get(id);
  return job && job.userId === userId ? job : null;
}

/** The finished PDF, handed out once (the job is dropped afterwards). */
export function takeReportPdf(id: string, userId: string): { pdf: Buffer; name: string } | null {
  const job = getReportPdfJob(id, userId);
  if (!job || job.status !== "done" || !job.pdf) return null;
  jobs.delete(id);
  return { pdf: job.pdf, name: job.name };
}
