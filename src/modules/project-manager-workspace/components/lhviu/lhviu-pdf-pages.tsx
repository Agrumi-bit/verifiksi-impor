"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * An uploaded PDF shown page by page as images (server-rendered by pdf.js) — so it prints as part of
 * a merged report instead of living in a browser PDF viewer.
 */
export function LhviuPdfPages({ path, width = 1240 }: { path: string; width?: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["files", "pdf-info", path],
    queryFn: async () => {
      const response = await fetch(`/api/files/thumbnail?info=1&path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error("PDF tidak dapat dibaca");
      return ((await response.json()) as { pageCount: number }).pageCount;
    },
  });

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Memuat dokumen PDF...</p>;
  if (isError || !data) return <p className="py-6 text-center text-sm text-destructive">Dokumen PDF tidak dapat ditampilkan.</p>;

  return (
    <>
      {Array.from({ length: data }, (_, i) => i + 1).map((page) => (
        <div key={page} className="lhviu-pdf-sheet">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/thumbnail?path=${encodeURIComponent(path)}&page=${page}&width=${width}&format=jpeg`}
            alt={`Halaman ${page} dari ${data}`}
          />
        </div>
      ))}
    </>
  );
}
