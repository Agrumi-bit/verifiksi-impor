"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
};

/** Largest PNG accepted for an uploaded signature image. */
const MAX_SIGNATURE_PNG_BYTES = 2 * 1024 * 1024;
/** Blank margin kept around an uploaded signature inside the pad. */
const UPLOAD_PADDING_PX = 16;

/**
 * Canvas-based sign pad — draw with the pointer, or upload a PNG of an existing signature (scaled to fit,
 * transparency kept). Either way it reports a PNG data URL of the canvas, so callers store one format.
 * Sized to the parent container, minimum half the viewport height. No external dependency.
 */
export function SignaturePad({ onChange, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Size the canvas bitmap to match its rendered box (at device pixel ratio) so strokes stay
  // crisp — a plain CSS-scaled canvas blurs/stretches once it grows past its intrinsic size.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const rect = container!.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas!.width = Math.round(rect.width * ratio);
      canvas!.height = Math.round(rect.height * ratio);
      const ctx = canvas!.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
      }
      setHasStroke(false);
      onChange(null);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getContext(): CanvasRenderingContext2D | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = getContext();
    if (!ctx) return;
    drawingRef.current = true;
    canvasRef.current?.setPointerCapture(event.pointerId);
    const { x, y } = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#20180f";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    if (!hasStroke) setHasStroke(true);
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasStroke) onChange(canvas.toDataURL("image/png"));
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setUploadError(null);
    onChange(null);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") {
      setUploadError("Format harus PNG.");
      return;
    }
    if (file.size > MAX_SIGNATURE_PNG_BYTES) {
      setUploadError("Ukuran file maksimal 2 MB.");
      return;
    }
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = getContext();
    if (!canvas || !container || !ctx) return;
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file);
    } catch {
      setUploadError("File PNG tidak dapat dibaca.");
      return;
    }
    // The context is already scaled by devicePixelRatio, so lay the image out in CSS pixels.
    const { width, height } = container.getBoundingClientRect();
    const scale = Math.min((width - UPLOAD_PADDING_PX * 2) / image.width, (height - UPLOAD_PADDING_PX * 2) / image.height, 1);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    image.close();
    setUploadError(null);
    setHasStroke(true);
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className={cn(
          "h-[50vh] min-h-90 w-full overflow-hidden rounded-lg border border-[#e8dccd] bg-white",
          disabled && "opacity-60",
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="block h-full w-full touch-none"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("text-[11.5px]", uploadError ? "text-[#c0392b]" : "text-[#a68f80]")}>
          {uploadError ?? (hasStroke ? "Tanda tangan tersimpan." : "Gambar tanda tangan Anda di area di atas, atau unggah file PNG.")}
        </span>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-md border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813] disabled:opacity-50"
          >
            Unggah PNG
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || !hasStroke}
            className="rounded-md border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813] disabled:opacity-50"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
