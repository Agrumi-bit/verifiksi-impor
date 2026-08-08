import "server-only";
import { createCanvas } from "@napi-rs/canvas";

/**
 * Rasterizes a PDF's first page to PNG. Used to show real document content in
 * report previews instead of embedding the PDF live — an <iframe>/<object> to
 * a PDF pulls in the browser's native viewer chrome (including its "digitally
 * signed / signature couldn't be verified" infobar for signed documents),
 * which can't be suppressed from the embedding page.
 */
export async function renderPdfFirstPageToPng(pdfBuffer: Buffer, targetWidth = 480): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
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
