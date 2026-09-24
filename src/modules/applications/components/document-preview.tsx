"use client";

type Props = { path?: string | null; label?: string };

export function DocumentPreview({ path, label }: Props) {
  if (!path) {
    return (
      <div className="flex aspect-[0.77] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        Dokumen belum diunggah
      </div>
    );
  }

  const url = `/api/files?path=${encodeURIComponent(path)}`;
  const isImage = /\.(jpg|jpeg|png)$/i.test(path);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="aspect-[0.77] w-full overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label ?? "Dokumen"} className="size-full object-contain" />
        ) : (
          <iframe src={url} title={label ?? "Dokumen"} className="size-full" />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-primary hover:underline"
      >
        Buka di tab baru
      </a>
    </div>
  );
}
