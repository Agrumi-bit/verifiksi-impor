import type { ProcessTimeline as ProcessTimelineData } from "../../report";

/*
 * Timeline Verifikasi for print: Tanggal Permohonan → Survey Lokasi → Verifikasi Dokumen → Terbit
 * LHVIU on one axis, with the total in working days (Mon–Fri) as the headline figure.
 */

const TEXT = { primary: "#1f1d1a", secondary: "#55524c", muted: "#6f6b64" };
const HAIRLINE = "#e1e0d9";
const ACCENT = "#0ca30c";
const PENDING = "#c3c2b7";

export function ProcessTimeline({ data }: { data: ProcessTimelineData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 170px", gap: 12, background: "#fffdf9", border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: "12px 14px" }}>
      <div>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.muted }}>Timeline verifikasi</div>
        <ol style={{ display: "grid", gridTemplateColumns: `repeat(${data.steps.length}, minmax(0, 1fr))`, listStyle: "none", margin: "14px 0 0", padding: 0 }}>
          {data.steps.map((step, index) => {
            const last = index === data.steps.length - 1;
            const nextReached = !last && data.steps[index + 1].reached;
            return (
              <li key={step.label} style={{ position: "relative", paddingRight: 8 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    aria-hidden
                    style={{ width: 14, height: 14, flexShrink: 0, borderRadius: 999, background: step.reached ? ACCENT : "#fff", border: `2px solid ${step.reached ? ACCENT : PENDING}` }}
                  />
                  {!last && <span aria-hidden style={{ flex: 1, height: 2, margin: "0 6px", background: step.reached && nextReached ? ACCENT : PENDING }} />}
                </div>
                <div style={{ marginTop: 8, fontSize: 9, color: TEXT.muted }}>
                  {index + 1}. {step.label}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: step.reached ? TEXT.primary : TEXT.muted }}>{step.date}</div>
                {step.note && <div style={{ marginTop: 2, fontSize: 8.5, color: TEXT.muted }}>{step.note}</div>}
              </li>
            );
          })}
        </ol>
      </div>
      <div style={{ borderLeft: `1px solid ${HAIRLINE}`, paddingLeft: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT.muted }}>Total hari verifikasi</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: TEXT.primary }}>{data.workingDays ?? "—"}</span>
          {data.workingDays !== null && <span style={{ fontSize: 11, color: TEXT.secondary }}>hari kerja</span>}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 8.5, lineHeight: 1.4, color: TEXT.muted }}>{data.basis} Sabtu dan Minggu tidak dihitung.</p>
      </div>
    </div>
  );
}
