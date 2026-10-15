"use client";

import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";

import { photoMapsHref, photoMetaCaption, type PhotoMeta } from "@/lib/photo-meta";

/** One uploaded field-documentation photo shown in a survey report. */
export type DocumentationPhoto = {
  key: string;
  title: string;
  caption?: string;
  filePath: string;
  date?: string;
};

type Orientation = "portrait" | "landscape";

// Sized copies of each photo (lib/image-thumb.ts) instead of camera originals of several MB:
// `report` (1400 px) for the large cells, `thumb` (480 px, ~30 KB — still ~200 dpi at the ~6 cm a
// small tile takes on A4) for the small tiles. Keeps a report with dozens of photos light.
const fileUrl = (path: string, variant: "report" | "thumb" = "report") => `/api/files?path=${encodeURIComponent(path)}&variant=${variant}`;

/**
 * Placement of photo `index` in a 6-column grid of TRACK px rows for `count` photos, by
 * orientation: `col` = columns spanned, `span` = row tracks spanned (image + its caption line).
 * Every cell shows its photo with `object-fit: contain`, so nothing is ever cropped — the spans
 * only decide how much room each photo gets. Spans of side-by-side cells always add up, so the
 * dense grid leaves no holes.
 *   1   → (rendered on its own, full width, max ~420px tall)
 *   2   → two side-by-side columns (a landscape + portrait pair gets a wide + a narrow cell)
 *   3   → one large on the left spanning both rows + two stacked on the right
 *   4   → 2×2, 1 wide + 3 small when landscape photos dominate, or wide/narrow pairs when mixed
 *   5+  → one large block + two stacked beside it, then the rest as small tiles, 3 per row
 */
function placement(index: number, orientations: Orientation[]): { col: number; span: number } {
  const count = orientations.length;
  const landscapeCount = orientations.filter((o) => o === "landscape").length;
  const bigPortrait = orientations[0] === "portrait";

  const isPortrait = orientations[index] === "portrait";
  // Mixed orientations: landscape gets a wide cell, portrait a narrow tall one, in rows of 6 cols.
  if (count === 2) {
    if (landscapeCount === 1) return isPortrait ? { col: 2, span: 8 } : { col: 4, span: 8 };
    return { col: 3, span: landscapeCount === 2 ? 7 : 11 };
  }
  if (count === 3) {
    if (bigPortrait) return index === 0 ? { col: 3, span: 12 } : { col: 3, span: 6 };
    return index === 0 ? { col: 4, span: 10 } : { col: 2, span: 5 };
  }
  if (count === 4) {
    if (landscapeCount >= 3) return index === 0 ? { col: 6, span: 9 } : { col: 2, span: 5 };
    if (landscapeCount === 2) return isPortrait ? { col: 2, span: 8 } : { col: 4, span: 8 };
    if (landscapeCount === 1) return isPortrait ? { col: 2, span: 8 } : { col: 6, span: 8 };
    return { col: 3, span: 11 };
  }
  if (bigPortrait) {
    if (index === 0) return { col: 3, span: 12 };
    if (index <= 2) return { col: 3, span: 6 };
    return { col: 2, span: 5 };
  }
  if (index === 0) return { col: 4, span: 10 };
  return { col: 2, span: 5 };
}

const TRACK = 28; // px row track — a 6-col grid in the ~610px A4 content area

function Caption({ photo, meta }: { photo: DocumentationPhoto; meta?: PhotoMeta }) {
  const taken = photoMetaCaption(meta);
  return (
    <figcaption style={{ marginTop: 4, fontSize: 10, lineHeight: 1.35, color: "var(--ink-faint, #8a7565)" }}>
      <span style={{ fontWeight: 600, color: "var(--ink, #20180f)" }}>{photo.title}</span>
      {photo.caption ? ` — ${photo.caption}` : ""}
      {photo.date ? ` · ${photo.date}` : ""}
      {taken && (
        <span style={{ display: "block" }}>
          {meta?.lat !== undefined ? (
            <a href={photoMapsHref(meta)} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{taken}</a>
          ) : (
            taken
          )}
        </span>
      )}
    </figcaption>
  );
}

/** Date/GPS kept with each photo at upload (read from EXIF in the browser before compression). */
function usePhotoMeta(paths: string[]): Record<string, PhotoMeta> {
  const { data } = useQuery({
    queryKey: ["photo-meta", paths],
    enabled: paths.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const query = paths.map((p) => `path=${encodeURIComponent(p)}`).join("&");
      const res = await fetch(`/api/files/meta?${query}`);
      if (!res.ok) return {};
      return ((await res.json()) as { data: Record<string, PhotoMeta> }).data;
    },
  });
  return data ?? {};
}

const imageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  background: "oklch(0.97 0.005 60)",
  borderRadius: 6,
};

/**
 * "Dokumentasi Lapangan" — only photos that were actually uploaded, in a borderless bento grid
 * sized from each photo's natural orientation (read on load). Photos are never cropped and never
 * split across printed pages.
 */
export function DocumentationBento({ photos }: { photos: DocumentationPhoto[] }) {
  const [orientationByKey, setOrientationByKey] = useState<Record<string, Orientation>>({});
  const metaByPath = usePhotoMeta(photos.map((photo) => photo.filePath));
  const orientations = photos.map((photo) => orientationByKey[photo.key] ?? "landscape");

  function onLoad(key: string, image: HTMLImageElement) {
    const orientation: Orientation = image.naturalHeight > image.naturalWidth ? "portrait" : "landscape";
    setOrientationByKey((current) => (current[key] === orientation ? current : { ...current, [key]: orientation }));
  }

  if (photos.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--ink-faint, #8a7565)" }}>Tidak ada dokumentasi lapangan yang dilampirkan.</p>;
  }

  if (photos.length === 1) {
    const [photo] = photos;
    return (
      <figure style={{ margin: 0, breakInside: "avoid" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(photo.filePath)}
          alt={photo.title}
          onLoad={(event) => onLoad(photo.key, event.currentTarget)}
          style={{ ...imageStyle, height: "auto", maxHeight: 420, width: "auto", maxWidth: "100%", margin: "0 auto" }}
        />
        <Caption photo={photo} meta={metaByPath[photo.filePath]} />
      </figure>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gridAutoRows: TRACK,
        gridAutoFlow: "row dense",
        gap: 9,
      }}
    >
      {photos.map((photo, index) => {
        const { col, span } = placement(index, orientations);
        return (
          <figure
            key={photo.key}
            style={{
              margin: 0,
              gridColumn: `span ${col}`,
              gridRow: `span ${span}`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ flex: 1, minHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(photo.filePath, index === 0 || photos.length <= 2 ? "report" : "thumb")}
                alt={photo.title}
                onLoad={(event) => onLoad(photo.key, event.currentTarget)}
                style={imageStyle}
              />
            </div>
            <Caption photo={photo} meta={metaByPath[photo.filePath]} />
          </figure>
        );
      })}
    </div>
  );
}
