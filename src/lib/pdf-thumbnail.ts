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
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), ...PDFJS_RESOURCES }).promise;
  const page = await pdf.getPage(1);

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

  return canvas.toBuffer("image/png");
}
