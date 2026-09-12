/** Real client-side CSV export (no backend call) — used by "Semua Merek"'s
 * toolbar and bulk-action Export. Excel/PDF are not implemented (would need
 * a new dependency this pass didn't add); their menu items say so instead
 * of pretending to generate a file. */
export function downloadBrandsCsv(
  rows: {
    brandName: string;
    ownerTitle: string | null;
    companyName: string | null;
    countryOfOrigin: string;
    trademarkClass: string | null;
    registrationNumber: string | null;
    status: string;
    completenessPercent: number;
  }[],
  fileName = "semua-merek.csv",
) {
  const headers = ["Merek", "Pemilik Merek", "Perusahaan", "Negara", "Kelas", "No. Sertifikat / Pendaftaran", "Status", "Kelengkapan (%)"];
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.brandName,
        r.ownerTitle ?? "",
        r.companyName ?? "",
        r.countryOfOrigin,
        r.trademarkClass ?? "",
        r.registrationNumber ?? "",
        r.status,
        String(r.completenessPercent),
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
