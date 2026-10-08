/**
 * Next.js server start hook. Queues compressed viewing copies for existing large PDFs a minute
 * after boot (low priority, one at a time) — see `src/lib/pdf-preview.ts`.
 */
export async function register() {
  // Keep this exact `NEXT_RUNTIME === "nodejs"` check so the Node-only import is dropped from the
  // edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV !== "production") return;
    const { sweepPdfPreviews } = await import("@/lib/pdf-preview");
    setTimeout(() => {
      void sweepPdfPreviews().catch((error) => console.error("[pdf-preview] sweep failed", error));
    }, 60_000);
  }
}
