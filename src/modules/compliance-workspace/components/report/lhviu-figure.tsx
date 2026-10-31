import type { LhviuFigure as LhviuFigureData, ReportTone } from "../../report";
import { ProcessTimeline } from "./process-timeline";

/*
 * Section 8 "LHVIU" as a figure for print: the signed LHVIU's first page (rendered by
 * /api/files/thumbnail) beside its number, validity status and Terbit → Berlaku sampai timeline.
 * Status colour always sits with its label.
 */

const STATUS: Record<ReportTone, { fill: string; soft: string }> = {
  green: { fill: "#0ca30c", soft: "#E8F6E8" },
  orange: { fill: "#fab219", soft: "#FFF4DC" },
  red: { fill: "#d03b3b", soft: "#FBE9E9" },
  slate: { fill: "#a3a39b", soft: "#F1F0EC" },
};
const TEXT = { primary: "#1f1d1a", secondary: "#55524c", muted: "#6f6b64" };
const HAIRLINE = "#e1e0d9";
/** Fixed cover size (A4 portrait ratio) so the sheet layout is measured the same before and after the image loads. */
const COVER = { width: 300, height: 424 };

function coverSrc(path: string): string {
  return `/api/files/thumbnail?path=${encodeURIComponent(path)}&page=1&width=600&format=jpeg`;
}

const LABEL: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.muted };
const CARD: React.CSSProperties = { background: "#fffdf9", border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: "12px 14px" };

function Timeline({ data }: { data: LhviuFigureData }) {
  const status = STATUS[data.status.tone];
  return (
    <div style={CARD}>
      <div style={LABEL}>Masa berlaku LHVIU</div>
      <ol style={{ display: "flex", justifyContent: "space-between", listStyle: "none", margin: "10px 0 6px", padding: 0 }}>
        {data.timeline.map((point) => (
          <li key={point.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, color: TEXT.muted }}>{point.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: TEXT.primary }}>{point.date}</span>
          </li>
        ))}
      </ol>
      {data.elapsed !== null && (
        <>
          <div
            role="img"
            aria-label={`${Math.round(data.elapsed * 100)}% masa berlaku telah berjalan`}
            style={{ position: "relative", height: 8, borderRadius: 4, background: status.soft, marginTop: 6 }}
          >
            <div style={{ width: `${data.elapsed * 100}%`, height: "100%", borderRadius: 4, background: status.fill }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 8.5, color: TEXT.muted }}>
            <span>Terbit</span>
            <span>1 tahun</span>
          </div>
        </>
      )}
      <p style={{ margin: "8px 0 0", fontSize: 10, color: TEXT.secondary }}>{data.remaining}</p>
    </div>
  );
}

export function LhviuFigure({ data }: { data: LhviuFigureData }) {
  const status = STATUS[data.status.tone];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${COVER.width}px 1fr`, gap: 16, alignItems: "start", marginBottom: 12 }}>
      <figure style={{ margin: 0 }}>
        {data.coverPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored file rendered by /api/files/thumbnail
          <img
            src={coverSrc(data.coverPath)}
            alt={`Halaman sampul LHVIU ${data.number}`}
            width={COVER.width}
            height={COVER.height}
            style={{ display: "block", width: COVER.width, height: COVER.height, objectFit: "contain", background: "#fff", border: `1px solid ${HAIRLINE}`, borderRadius: 6, boxShadow: "0 2px 8px rgba(31,29,26,0.08)" }}
          />
        ) : (
          <div style={{ width: COVER.width, height: COVER.height, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${HAIRLINE}`, borderRadius: 6, fontSize: 10, color: TEXT.muted, background: "#fffdf9" }}>
            Dokumen LHVIU belum diunggah
          </div>
        )}
        <figcaption style={{ marginTop: 6, fontSize: 9, color: TEXT.muted, textAlign: "center" }}>Halaman sampul LHVIU</figcaption>
      </figure>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ ...CARD, background: status.soft, borderColor: status.fill }}>
          <div style={LABEL}>Nomor LHVIU</div>
          <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: TEXT.primary, overflowWrap: "anywhere" }}>{data.number}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, fontWeight: 600, color: TEXT.primary }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: status.fill }} />
            {data.status.text}
          </div>
        </div>
        <Timeline data={data} />
        <div style={CARD}>
          <div style={LABEL}>Diterbitkan oleh</div>
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: TEXT.primary }}>{data.issuedBy}</div>
        </div>
        <ProcessTimeline data={data.process} />
      </div>
    </div>
  );
}
