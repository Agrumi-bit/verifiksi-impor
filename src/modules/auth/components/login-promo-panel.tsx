"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { usePublicLoginSlides, loginSlideImageHref } from "@/modules/system-configuration/use-login-slides";
import { useBranding } from "@/modules/branding/use-branding";

const ROTATE_INTERVAL_MS = 6000;

function EmptyPromoPanel() {
  const { data: branding } = useBranding();
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
        <ShieldCheck className="size-7" />
      </span>
      <h2 className="text-2xl font-semibold text-white">Welcome to {branding?.appName ?? "IVP"}</h2>
      <p className="max-w-sm text-sm text-white/70">
        Kelola aktivitas verifikasi Anda dengan aman dan efisien — permohonan, survei lapangan, dokumen, dan penilaian kemampuan
        industri dalam satu platform.
      </p>
    </div>
  );
}

export function LoginPromoPanel() {
  const { data: slides, isLoading } = usePublicLoginSlides();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides?.length ?? 0;

  useEffect(() => {
    if (count < 2 || isPaused) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, isPaused]);

  // Clamp when the slide list shrinks (e.g. a slide's schedule window just ended) so we never
  // hold an index past the end of the array.
  const activeIndex = count > 0 ? index % count : 0;

  return (
    <div
      className="relative h-full min-h-100 w-full overflow-hidden bg-[color-mix(in_oklch,var(--primary)_22%,#0a1420)] lg:min-h-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 45%), radial-gradient(circle at 80% 85%, color-mix(in oklch, var(--primary) 25%, transparent), transparent 45%)",
        }}
      />

      {!isLoading && count === 0 && <EmptyPromoPanel />}

      {count > 0 &&
        slides?.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0 flex flex-col justify-end transition-opacity duration-700 ease-out"
            style={{ opacity: i === activeIndex ? 1 : 0, pointerEvents: i === activeIndex ? "auto" : "none" }}
            aria-hidden={i !== activeIndex}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={loginSlideImageHref(slide.imagePath)} alt={slide.title} className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="relative flex flex-col gap-3 p-10 pb-16">
              {slide.label && (
                <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
                  {slide.label}
                </span>
              )}
              <h2 className="text-2xl leading-tight font-semibold text-white">{slide.title}</h2>
              {slide.description && <p className="max-w-md text-sm text-white/80">{slide.description}</p>}
              {slide.ctaLabel && (
                <a
                  href={slide.ctaUrl || "#"}
                  className="mt-1 flex w-fit items-center gap-1.5 text-sm font-semibold text-white hover:underline"
                >
                  {slide.ctaLabel}
                  <ArrowRight className="size-4" />
                </a>
              )}
            </div>
          </div>
        ))}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={() => setIndex((prev) => (prev - 1 + count) % count)}
            className="absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={() => setIndex((prev) => (prev + 1) % count)}
            className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides?.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ke slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
