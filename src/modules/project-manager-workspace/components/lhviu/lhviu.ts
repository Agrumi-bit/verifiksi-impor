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

/**
 * The final report differs per verification type: VIU ends with the Laporan Hasil VIU (LHVIU, berlaku 1
 * tahun — Pasal 39 ayat (6)), VKI with the Laporan Hasil VKI (LHVKI, berlaku 3 tahun — Pasal 32 ayat (4)).
 * Both are stored the same way (Application.lhviuDocument); only the wording differs.
 */
export type FinalReportLabels = { abbr: string; hasil: string; full: string; divider: string; placeholder: string; usage: string };
export function finalReportLabels(verificationType: string | null | undefined): FinalReportLabels {
  return String(verificationType).toUpperCase() === "VKI"
    ? {
        abbr: "LHVKI", hasil: "Laporan Hasil VKI", full: "Laporan Hasil Verifikasi Kemampuan Industri (LHVKI)", divider: "LAPORAN HASIL VERIFIKASI KEMAMPUAN INDUSTRI",
        placeholder: "mis. 3/LHVKI/TBI/III/2026", usage: "Dipakai Laporan Pelaksanaan VKI (Pasal 47) untuk periode laporan menurut tanggal terbit dan masa berlaku 3 tahun (Pasal 32 ayat (4)).",
      }
    : {
        abbr: "LHVIU", hasil: "Laporan Hasil VIU", full: "Laporan Hasil Verifikasi Importir Umum (LHVIU)", divider: "LAPORAN HASIL VERIFIKASI IMPORTIR UMUM",
        placeholder: "mis. 3/LHVIU/TBI/III/2026", usage: "Dipakai Laporan Pelaksanaan VIU (Pasal 47) untuk jumlah LHVIU per bulan terbit dan masa berlaku 1 tahun.",
      };
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
