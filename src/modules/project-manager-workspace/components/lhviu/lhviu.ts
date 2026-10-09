/**
 * LHVIU tab — which reports can be merged into the "Laporan Verifikasi". Items travel in the URL as
 * `survey:<assignmentNumber>:<locationVisitId>`, `dokumen:<assignmentNumber>`, `teknis:<assignmentNumber>`.
 */
export type LhviuItem =
  | { kind: "survey"; assignmentNumber: string; visitId: string }
  | { kind: "dokumen"; assignmentNumber: string }
  | { kind: "teknis"; assignmentNumber: string };

export function encodeLhviuItem(item: LhviuItem): string {
  return item.kind === "survey" ? `survey:${item.assignmentNumber}:${item.visitId}` : `${item.kind}:${item.assignmentNumber}`;
}

export function decodeLhviuItems(value: string | null | undefined): LhviuItem[] {
  if (!value) return [];
  return value
    .split(",")
    .map((token) => token.trim().split(":"))
    .flatMap((parts): LhviuItem[] => {
      if (parts[0] === "survey" && parts[1] && parts[2]) return [{ kind: "survey", assignmentNumber: parts[1], visitId: parts[2] }];
      if ((parts[0] === "dokumen" || parts[0] === "teknis") && parts[1]) return [{ kind: parts[0], assignmentNumber: parts[1] }];
      return [];
    });
}

export type LhviuMode = "laporan-verifikasi" | "laporan-lengkap";
export type LhviuOrder = "lhviu-first" | "verifikasi-first";

export function lhviuReportHref(
  type: string,
  applicationNumber: string,
  mode: LhviuMode,
  items: LhviuItem[],
  order: LhviuOrder = "lhviu-first",
): string {
  const params = new URLSearchParams({ items: items.map(encodeLhviuItem).join(",") });
  if (mode === "laporan-lengkap") params.set("order", order);
  return `/project-manager-workspace/applications/${type}/${applicationNumber}/lhviu/${mode}?${params.toString()}`;
}

export type LhviuDocumentInfo = {
  path: string;
  fileName: string;
  uploadedAt: string;
  uploadedByName: string | null;
  number: string | null;
  issuedAt: string | null;
} | null;
