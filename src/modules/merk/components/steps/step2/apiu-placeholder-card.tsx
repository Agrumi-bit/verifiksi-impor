"use client";

/**
 * TODO(viu-application-integration): "API-U saat ini" should come from the
 * VIU Application this Merk registration is filed under (see project memory
 * — that Application↔Merk integration was explicitly deferred). Until it
 * exists there is no real applicant-company record to show here, so this
 * renders a placeholder instead of a fabricated company card.
 */
export function ApiuPlaceholderCard({ badge }: { badge: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Data perusahaan API-U akan otomatis terisi dari Aplikasi VIU (integrasi menyusul).
      </p>
      <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {badge}
      </span>
    </div>
  );
}
