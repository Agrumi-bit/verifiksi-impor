import "server-only";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";

/**
 * pdf.js decodes JPEG 2000 (JPXDecode) and JBIG2 images with WebAssembly, and draws non-embedded
 * fonts from its standard-font data — in Node it only finds those files when told where they are.
 * Without `wasmUrl`, a page that is one big JPX image (common for scanned or "pdf.io"-converted
 * documents) renders as a blank white page. The package ships these folders and the Docker image
 * copies the whole package into /app/node_modules (see Dockerfile), resolved here from the cwd.
 */
const PDFJS_DIR = path.join(process.cwd(), "node_modules", "pdfjs-dist") + path.sep;
const PDFJS_RESOURCES = {
  wasmUrl: `${PDFJS_DIR}wasm${path.sep}`,
  standardFontDataUrl: `${PDFJS_DIR}standard_fonts${path.sep}`,
  cMapUrl: `${PDFJS_DIR}cmaps${path.sep}`,
  cMapPacked: true,
};

/**
 * Rasterizes a PDF's first page to PNG. Used to show real document content in
 * report previews instead of embedding the PDF live — an <iframe>/<object> to
 * a PDF pulls in the browser's native viewer chrome (including its "digitally
 * signed / signature couldn't be verified" infobar for signed documents),
 * which can't be suppressed from the embedding page.
 */
export async function renderPdfFirstPageToPng(pdfBuffer: Buffer, targetWidth = 480): Promise<Buffer> {
  return renderPdfPageToPng(pdfBuffer, 1, targetWidth);
}

/** Number of pages in a PDF. */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), ...PDFJS_RESOURCES }).promise;
  return pdf.numPages;
}

/** Rasterizes one page (1-based) of a PDF to PNG — used to place an uploaded PDF inside a printable report. */
export async function renderPdfPageToPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  targetWidth = 480,
  format: "png" | "jpeg" = "png",
): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), ...PDFJS_RESOURCES }).promise;
  const page = await pdf.getPage(Math.min(Math.max(1, Math.floor(pageNumber)), pdf.numPages));

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  // JPEG is ~5x smaller than PNG for document pages — matters on slow links.
  return format === "jpeg" ? canvas.toBuffer("image/jpeg", 82) : canvas.toBuffer("image/png");
}
