"use client";

/* Tampilan cetak tabel khusus VIU Industri — salinan terpisah dari laporan Konsumsi. */
import type { ExportSection } from "../sections";

/** Print view: the selected sections as plain tables; only this block is visible when printing. */
export function PrintView({ sections, title, meta }: { sections: ExportSection[]; title: string; meta: string }) {
  return (
    <div className="p47-print" aria-hidden="true">
      <h1>{title}</h1>
      <div>{meta}</div>
      {sections.map((s) => (
        <section key={s.no}>
          <h2>{s.no} {s.title}</h2>
          {s.tables.map((t, i) => (
            <div key={i}>
              {t.title && <b>{t.title}</b>}
              <table>
                <thead><tr>{t.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{t.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{typeof c === "number" ? c.toLocaleString("id-ID") : c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
