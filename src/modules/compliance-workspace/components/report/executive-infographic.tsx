import type { Infographic, ReportTone } from "../../report";

/*
 * Ringkasan Eksekutif as an infographic — a static figure for print/PDF (no hover layer). Colour
 * only ever carries status here (good / warning / critical / not yet) and never alone: every
 * coloured mark sits beside its label and a status icon.
 */

const STATUS: Record<ReportTone, { fill: string; ink: string; soft: string }> = {
  green: { fill: "#0ca30c", ink: "#ffffff", soft: "#E8F6E8" },
  orange: { fill: "#fab219", ink: "#0b0b0b", soft: "#FFF4DC" },
  red: { fill: "#d03b3b", ink: "#ffffff", soft: "#FBE9E9" },
  slate: { fill: "#a3a39b", ink: "#0b0b0b", soft: "#F1F0EC" },
};
const TEXT = { primary: "#1f1d1a", secondary: "#55524c", muted: "#6f6b64" };
const HAIRLINE = "#e1e0d9";

function StatusIcon({ tone, size = 14 }: { tone: ReportTone; size?: number }) {
  const { fill } = STATUS[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill={fill} />
      {tone === "green" && <path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {tone === "red" && <path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />}
      {tone === "orange" && <path d="M8 4.2v4.6M8 11.3v.2" stroke="#0b0b0b" strokeWidth="1.9" strokeLinecap="round" />}
      {tone === "slate" && <path d="M4.8 8h6.4" stroke="#0b0b0b" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

const CARD: React.CSSProperties = { background: "#fffdf9", border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: "12px 14px" };
const LABEL: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.muted };

/** Tall segmented bar: the requirements as one whole, each part its own block with its count inside. */
function RequirementBar({ data }: { data: Infographic }) {
  const parts = data.segments.filter((segment) => segment.value > 0);
  const name = parts.map((part) => `${part.label}: ${part.value}`).join(", ");
  return (
    <div>
      <div role="img" aria-label={`Komposisi ${data.total} requirement — ${name}`} style={{ display: "flex", gap: 2, height: 22 }}>
        {parts.map((part) => (
          <div
            key={part.label}
            style={{
              flex: `${part.value} 0 0`,
              minWidth: 4,
              background: STATUS[part.tone].fill,
              color: STATUS[part.tone].ink,
              borderRadius: 4,
              fontSize: 9.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              paddingLeft: 6,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {part.value / data.total >= 0.06 ? part.value : ""}
          </div>
        ))}
      </div>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", listStyle: "none", margin: "8px 0 0", padding: 0, fontSize: 9, color: TEXT.secondary }}>
        {data.segments.map((segment) => (
          <li key={segment.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: STATUS[segment.tone].fill }} />
            {segment.label} <strong style={{ color: TEXT.primary }}>{segment.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreCard({ data }: { data: Infographic }) {
  return (
    <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={LABEL}>Skor compliance</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: TEXT.primary }}>{data.score}%</span>
        <span style={{ fontSize: 10.5, color: TEXT.secondary }}>
          {data.segments[0].value} dari {data.total} requirement terpenuhi
        </span>
      </div>
      <RequirementBar data={data} />
    </div>
  );
}

function ConclusionCard({ data }: { data: Infographic }) {
  const tone = STATUS[data.conclusion.tone];
  return (
    <div style={{ ...CARD, background: tone.soft, borderColor: tone.fill, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={LABEL}>Kesimpulan</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: TEXT.primary }}>
        <StatusIcon tone={data.conclusion.tone} size={18} />
        {data.conclusion.label}
      </div>
      <p style={{ margin: 0, fontSize: 10, lineHeight: 1.5, color: TEXT.secondary }}>{data.conclusion.text}</p>
    </div>
  );
}

function Kpis({ data }: { data: Infographic }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.kpis.length}, minmax(0, 1fr))`, gap: 8 }}>
      {data.kpis.map((kpi) => (
        <div key={kpi.label} style={CARD}>
          <div style={LABEL}>{kpi.label}</div>
          <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.2, fontWeight: 700, color: TEXT.primary }}>{kpi.value}</div>
          <div style={{ marginTop: 2, fontSize: 9, lineHeight: 1.35, color: TEXT.muted, overflowWrap: "anywhere" }}>{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
}

function HandoverFlow({ data }: { data: Infographic }) {
  return (
    <div style={CARD}>
      <div style={LABEL}>Handover workspace sumber</div>
      <ol style={{ display: "flex", alignItems: "center", listStyle: "none", margin: "8px 0 0", padding: 0 }}>
        {data.workspaces.map((workspace, index) => (
          <li key={workspace.key} style={{ display: "flex", alignItems: "center", flex: index < data.workspaces.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <StatusIcon tone={workspace.tone} size={18} />
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: TEXT.primary }}>{workspace.label}</div>
                <div style={{ fontSize: 9, color: TEXT.muted }}>{workspace.state}</div>
              </div>
            </div>
            {index < data.workspaces.length - 1 && <span aria-hidden style={{ flex: 1, height: 2, margin: "0 12px", borderRadius: 1, background: workspace.tone === "green" ? STATUS.green.fill : HAIRLINE }} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StageGrid({ data }: { data: Infographic }) {
  return (
    <div>
      <div style={{ ...LABEL, marginBottom: 6 }}>Hasil pemeriksaan per tahap</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {data.stages.map((stage) => (
          <div key={stage.num} style={{ ...CARD, padding: "9px 12px", borderTop: `3px solid ${STATUS[stage.tone].fill}` }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: TEXT.muted }}>TAHAP {stage.num}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT.primary }}>{stage.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 9.5, fontWeight: 600, color: TEXT.secondary }}>
              <StatusIcon tone={stage.tone} size={12} />
              {stage.verdict}
            </div>
            <div style={{ fontSize: 9, color: TEXT.muted, marginTop: 2 }}>{stage.metric}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveInfographic({ data }: { data: Infographic }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 10 }}>
        <ScoreCard data={data} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ConclusionCard data={data} />
          <Kpis data={data} />
        </div>
      </div>
      <HandoverFlow data={data} />
      <StageGrid data={data} />
    </div>
  );
}
