import type { ReactNode } from "react";

import { CARD_BORDER, INK, MUTED, MUTED_2, NAVY, ORANGE_TEXT } from "@/modules/verifikator-workspace/components/report/document-verification-report";

import { nf } from "../format";

/*
 * Static, print-ready building blocks of the Laporan Pelaksanaan VIU — figures are plain SVG/HTML so they
 * render the same on screen, in "Cetak" and in "Unduh PDF". Palette follows the reference report.
 */
export const C = { own: "#d9691f", rent: "#2f6fc0", c3: "#1f9a7a", na: "#cdbfa9", orange: "#ed7b2f", orangeSoft: "#e88a3d", head: "#f2e9d9", paper: "#fdf9f4" };

export function SubHead({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 10px", paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}` }}>
      <span style={{ minWidth: 40, height: 26, padding: "0 8px", borderRadius: 13, background: C.orange, color: "#fff", fontSize: 11.5, fontWeight: 800, display: "grid", placeItems: "center" }}>{num}</span>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h2>
    </div>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, lineHeight: 1.65, color: INK, margin: "0 0 9px", textAlign: "justify" }}>{children}</p>;
}

export function Ikhtisar({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${C.orange}`, borderRadius: "0 12px 12px 0", background: "#fff", padding: "12px 16px 10px", margin: "4px 0 6px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: ORANGE_TEXT, marginBottom: 6 }}>IKHTISAR BAB</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

export function Limits({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 22, padding: "12px 16px 10px", border: `1px solid ${CARD_BORDER}`, borderRadius: 12, background: C.head }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: ORANGE_TEXT, marginBottom: 6 }}>CATATAN KETERBATASAN DATA</div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 11.5, lineHeight: 1.6, color: MUTED }}>{items.map((t) => <li key={t}>{t}</li>)}</ol>
    </div>
  );
}

/** "Gambar n  Judul" card with its source line. */
export function Figure({ num, title, source, children }: { num: string; title: string; source: string; children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "14px 16px 10px", margin: "6px 0 12px", breakInside: "avoid" }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
        <span style={{ color: ORANGE_TEXT, marginRight: 10 }}>Gambar {num}</span>
        {title}
      </div>
      {children}
      <div style={{ fontSize: 10, color: MUTED_2, marginTop: 10, paddingTop: 6, borderTop: `1px solid ${CARD_BORDER}` }}>Sumber: {source}</div>
    </div>
  );
}

export function TableCaption({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, margin: "8px 0 6px" }}>
      <span style={{ color: ORANGE_TEXT, fontWeight: 800, marginRight: 10 }}>Tabel {num}</span>
      {title}
    </div>
  );
}

/** Vertical columns, one per category (e.g. LHVIU per month), value printed on top. */
export function ColumnChart({ items, color = C.own, height = 150 }: { items: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 18, borderBottom: `1px solid ${CARD_BORDER}` }}>
        {items.map((i) => (
          <div key={i.label} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "min(60%, 34px)", height: `${(i.value / max) * 100}%`, minHeight: i.value ? 3 : 0, background: color, borderRadius: "4px 4px 0 0" }}>
              {i.value > 0 && <span style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", paddingBottom: 3, fontSize: 11, fontWeight: 800 }}>{nf(i.value)}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, paddingTop: 5 }}>
        {items.map((i) => <span key={i.label} style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: MUTED }}>{i.label}</span>)}
      </div>
    </div>
  );
}

/** Ranked horizontal bars with a key, a description and a value (+ share of `total`). */
export function HBarList({ rows, total, color = C.orange, keyWidth = 64 }: { rows: { key: string; desc?: string; value: number; muted?: boolean }[]; total?: number; color?: string; keyWidth?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "grid", gridTemplateColumns: `${keyWidth}px minmax(120px, 230px) 1fr 70px`, gap: 10, alignItems: "center", fontSize: 11.5, opacity: r.muted ? 0.6 : 1 }}>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{r.key}</b>
          <span style={{ color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc || "—"}</span>
          <span style={{ height: 11, background: C.head, borderRadius: 4, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0, background: color, borderRadius: "0 4px 4px 0" }} />
          </span>
          <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            <b>{nf(r.value)}</b>
            {total ? <span style={{ color: MUTED_2, fontSize: 10.5, marginLeft: 6 }}>{Math.round((r.value / total) * 100)}%</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Donut with its legend; `center` is printed in the hole. */
export function Donut({ segs, center, sub, size = 132, fmt = nf }: { segs: { label: string; value: number; color: string; note?: string }[]; center: string; sub?: string; size?: number; fmt?: (v: number) => string }) {
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const R = 52;
  const circ = 2 * Math.PI * R;
  // Start of each segment along the ring — cumulative lengths computed up front (no mutation in render).
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, s) => a + (s.value / total) * circ, 0));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${size}px 1fr`, gap: 18, alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="0 0 140 140" width={size} height={size} style={{ transform: "rotate(-90deg)" }} role="img" aria-label={segs.map((s) => `${s.label} ${s.value}`).join(", ")}>
          <circle cx="70" cy="70" r={R} fill="none" stroke={C.head} strokeWidth="18" />
          {segs.map((s, i) => {
            const len = (s.value / total) * circ;
            return <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-starts[i]} />;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <b style={{ fontSize: center.length > 7 ? 13 : center.length > 5 ? 15 : 22, fontWeight: 800, lineHeight: 1.1 }}>{center}</b>
          {sub && <span style={{ fontSize: 10, color: MUTED }}>{sub}</span>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 7, fontSize: 12 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: "none" }} />
            <span style={{ flex: 1, color: MUTED }}>
              {s.label}
              {s.note && <em style={{ display: "block", fontStyle: "normal", fontSize: 10.5, color: MUTED_2 }}>{s.note}</em>}
            </span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(s.value)}</b>
            <small style={{ minWidth: 40, textAlign: "right", color: MUTED_2, fontSize: 10.5 }}>{s.value > 0 && (s.value / total) * 100 < 0.5 ? "<1" : Math.round((s.value / total) * 100)}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Navy chapter-opening page body: big outlined number, title, lead, Cakupan Bab and a stats band. */
export function DividerBody({ n, title, lead, scope, stats }: { n: number; title: string; lead: string; scope: string[]; stats: [string, string][] }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <div aria-hidden style={{ position: "absolute", right: -18, top: -30, fontSize: 280, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "transparent", WebkitTextStroke: "1.5px #ed7b2f55", pointerEvents: "none", zIndex: -1 }}>
        {String(n).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30 }}>
        <span style={{ flex: "0 0 56px", height: 2, background: C.orangeSoft }} />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: C.orangeSoft }}>BAB {n}</span>
      </div>
      <h1 style={{ fontSize: 48, lineHeight: 1.04, margin: "18px 0 16px", maxWidth: "12ch", color: C.orangeSoft, fontWeight: 800 }}>{title}</h1>
      <p style={{ color: "#c3ccd7", fontSize: 14, lineHeight: 1.65, maxWidth: "54ch", margin: 0 }}>{lead}</p>
      {scope.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 28px", margin: "22px 0 26px" }}>
          <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.orangeSoft, marginBottom: 6 }}>CAKUPAN BAB</div>
          {scope.map((t, i) => (
            <div key={t} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid #1e2a38", fontSize: 12.5, color: "#dfe5ec" }}>
              <b style={{ fontSize: 10.5, color: "#8a97a8", minWidth: 24 }}>{n}.{i + 1}</b>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}
      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, background: C.orange, color: NAVY, borderRadius: 14, marginTop: "auto", marginBottom: 8, overflow: "hidden" }}>
          {stats.map(([v, l], i) => (
            <div key={l} style={{ padding: "18px 18px 16px", borderLeft: i ? "1px solid #04101f2e" : 0 }}>
              <div style={{ fontSize: v.length > 6 ? 22 : 32, lineHeight: v.length > 6 ? "32px" : 1, fontWeight: 800, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#04101fcc", marginTop: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SERIES = ["#2f6fc0", "#1f9a7a", "#d9691f", "#8a5cc7", "#c2417a"];

/** Two ranked columns side by side (e.g. top HS by volume vs by value); the leader gets a hero card. */
export function RankColumns({ cols }: { cols: { title: string; color: string; format: (v: number) => string; total: number; rows: { key: string; label: string; value: number; note: string }[] }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 16 }}>
      {cols.map((c) => {
        const max = Math.max(1, ...c.rows.map((r) => r.value));
        const [hero, ...rest] = c.rows;
        return (
          <div key={c.title} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>{c.title.toUpperCase()}</div>
            {hero ? (
              <div style={{ borderRadius: 12, padding: "10px 14px", color: "#fff", background: c.color, marginBottom: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", opacity: 0.85 }}>PERINGKAT 1</div>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, marginTop: 2, overflowWrap: "anywhere" }}>{hero.key}</div>
                <div style={{ fontSize: 11, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hero.label || "—"}</div>
                <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{c.format(hero.value)}</div>
                <div style={{ fontSize: 10.5, opacity: 0.9 }}>{c.total ? `${((hero.value / c.total) * 100).toFixed(1).replace(".", ",")}% dari total · ` : ""}{hero.note}</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: MUTED_2, padding: "6px 0" }}>Tidak ada data.</div>
            )}
            {rest.map((r, i) => (
              <div key={r.key} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: `1px solid ${CARD_BORDER}` }}>
                <span style={{ width: 18, flex: "none", fontSize: 10.5, fontWeight: 800, color: MUTED_2 }}>{i + 2}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
                    <b>{r.key}</b>
                    <em style={{ fontStyle: "normal", fontWeight: 700, whiteSpace: "nowrap" }}>{c.format(r.value)}</em>
                  </span>
                  <span style={{ fontSize: 10, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label || "—"} · {r.note}</span>
                  <span style={{ height: 6, background: C.head, borderRadius: 3, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${(r.value / max) * 100}%`, background: c.color, opacity: 0.85 }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Stacked column panels sharing one month axis (e.g. jumlah VIU, volume, nilai per bulan terbit). */
export function ColumnPanels({ labels, panels }: { labels: string[]; panels: { title: string; color: string; values: number[]; format: (v: number) => string }[] }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {panels.map((p, pi) => {
        const max = Math.max(1, ...p.values);
        return (
          <div key={p.title} style={{ borderTop: pi ? `1px solid ${CARD_BORDER}` : 0, paddingTop: pi ? 6 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: MUTED, textTransform: "uppercase" }}>{p.title}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 74, paddingTop: 16 }}>
              {p.values.map((v, i) => (
                <div key={labels[i]} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: "min(56%, 36px)", height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0, background: p.color, borderRadius: "3px 3px 0 0" }}>
                    {v > 0 && <span style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", paddingBottom: 2, fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{p.format(v)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 6, paddingTop: 5, borderTop: `1px solid ${CARD_BORDER}` }}>
        {labels.map((l) => <span key={l} style={{ flex: 1, textAlign: "center", fontSize: 9, color: MUTED }}>{l}</span>)}
      </div>
    </div>
  );
}

const shortNum = (v: number) => (v >= 1e12 ? `${(v / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T` : v >= 1e9 ? `${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M` : v >= 1e6 ? `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : v >= 1e3 ? `${Math.round(v / 1e3)} rb` : String(Math.round(v)));

/** Static multi-series line chart over months — print friendly, no interaction. */
export function LineSeries({ labels, series }: { labels: string[]; series: { label: string; values: number[] }[] }) {
  const W = 720, H = 220, L = 52, R = 12, T = 12, B = 26;
  const raw = Math.max(0, ...series.flatMap((s) => s.values));
  const p = raw > 0 ? Math.pow(10, Math.floor(Math.log10(raw))) : 1;
  const f = raw / p;
  const max = raw > 0 ? (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p : 1;
  const x = (i: number) => L + ((W - L - R) * (i + 0.5)) / Math.max(labels.length, 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.label).join(", ")}>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const v = (max * k) / 5;
          return (
            <g key={k}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={CARD_BORDER} strokeDasharray="3 3" />
              <text x={L - 6} y={y(v) + 3} fontSize="10" fill={MUTED} textAnchor="end">{shortNum(v)}</text>
            </g>
          );
        })}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} fontSize="10" fill={MUTED} textAnchor="middle">{l}</text>)}
        {series.map((s, si) => (
          <g key={s.label}>
            <polyline fill="none" stroke={SERIES[si % SERIES.length]} strokeWidth="2" strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={SERIES[si % SERIES.length]} stroke="#fff" strokeWidth="1.5" />)}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11, color: MUTED, marginTop: 4 }}>
        {series.map((s, si) => (
          <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: SERIES[si % SERIES.length] }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const SERIES_COLORS = SERIES;

/** Log–log scatter with the 1:1 diagonal (ratio 100%); points above it are drawn in the warning colour. */
export function ScatterLog({ points, xLabel, yLabel }: { points: { label: string; x: number; y: number; tag?: boolean }[]; xLabel: string; yLabel: string }) {
  const W = 720, H = 300, L = 58, R = 16, T = 12, B = 40;
  const pos = points.filter((pt) => pt.x > 0 && pt.y > 0);
  const vals = pos.flatMap((pt) => [pt.x, pt.y]);
  const lo = Math.floor(Math.log10(Math.min(...vals, 1e9)));
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...vals, 1e10))));
  const sx = (v: number) => L + ((Math.log10(v) - lo) / (hi - lo)) * (W - L - R);
  const sy = (v: number) => T + (1 - (Math.log10(v) - lo) / (hi - lo)) * (H - T - B);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, k) => Math.pow(10, lo + k));
  // Labels of tagged points, pushed down so neighbouring labels do not overlap.
  const tags = pos.filter((pt) => pt.tag).sort((a, b) => sy(a.y) - sy(b.y))
    .reduce<{ pt: (typeof pos)[number]; ly: number }[]>((acc, pt) => [...acc, { pt, ly: Math.max(sy(pt.y) - 6, (acc.at(-1)?.ly ?? -Infinity) + 12) }], []);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${yLabel} terhadap ${xLabel}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={T} y2={H - B} stroke={CARD_BORDER} strokeDasharray="3 3" />
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke={CARD_BORDER} strokeDasharray="3 3" />
            <text x={sx(t)} y={H - B + 14} fontSize="10" fill={MUTED} textAnchor="middle">{shortNum(t)}</text>
            <text x={L - 6} y={sy(t) + 3} fontSize="10" fill={MUTED} textAnchor="end">{shortNum(t)}</text>
          </g>
        ))}
        <line x1={sx(Math.pow(10, lo))} y1={sy(Math.pow(10, lo))} x2={sx(Math.pow(10, hi))} y2={sy(Math.pow(10, hi))} stroke={MUTED_2} strokeDasharray="6 4" />
        <text x={sx(Math.pow(10, hi)) - 4} y={sy(Math.pow(10, hi)) + 14} fontSize="10" fill={MUTED} textAnchor="end">rasio 100%</text>
        {pos.map((pt) => (
          <g key={pt.label}>
            <circle cx={sx(pt.x)} cy={sy(pt.y)} r="5" fill={pt.y > pt.x ? SERIES[2] : SERIES[0]} stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
        {tags.map(({ pt, ly }) => (
          <text key={pt.label} x={sx(pt.x) + 8} y={ly} fontSize="9.5" fontWeight="700" fill={INK} textAnchor={sx(pt.x) > W * 0.7 ? "end" : "start"} dx={sx(pt.x) > W * 0.7 ? -16 : 0}>{pt.label}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} fontSize="10.5" fill={MUTED} textAnchor="middle">{xLabel}</text>
        <text x={12} y={(T + H - B) / 2} fontSize="10.5" fill={MUTED} textAnchor="middle" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>{yLabel}</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11, color: MUTED, marginTop: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 5, background: SERIES[0] }} />Rasio ≤ 100%</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 5, background: SERIES[2] }} />Rasio &gt; 100%</span>
      </div>
    </div>
  );
}

/** Row of KPI tiles inside a figure; the first one is highlighted. */
export function KpiTiles({ tiles }: { tiles: [string, string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 10 }}>
      {tiles.map(([v, l, s], i) => (
        <div key={l} style={{ border: `1px solid ${i ? CARD_BORDER : "#b4561a"}`, background: i ? "#fff" : "#b4561a", color: i ? INK : "#fff", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: v.length > 7 ? 18 : 26, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.07em", color: i ? ORANGE_TEXT : "#fff", marginTop: 6 }}>{l}</div>
          <div style={{ fontSize: 10.5, color: i ? MUTED : "#fff", opacity: i ? 1 : 0.92, marginTop: 2 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

const Q = ["#f3d3bb", "#eaa775", "#df8040", "#c25d1b", "#8a3f10"];

/** World choropleth by estimated value (quintile bins); small countries without a shape drawn as dots. */
export function WorldMap({ base, width, height, countries, bins: rawBins, legendFormat }: {
  base: string; width: number; height: number;
  countries: { name: string; path: string; pt: [number, number]; value: number }[];
  bins: number[]; legendFormat: (v: number) => string;
}) {
  // Thresholds that print the same once rounded would give an empty-looking class ("12,5 T – 12,5 T").
  const bins = rawBins.filter((b, i) => i === rawBins.length - 1 || legendFormat(b) !== legendFormat(rawBins[i + 1]));
  // `bins` are distinct ascending thresholds; spread their classes over the 5-step palette.
  const classes = bins.length + 1;
  const color = (k: number) => Q[classes === 1 ? Q.length - 1 : Math.round((k * (Q.length - 1)) / (classes - 1))];
  const cls = (v: number) => bins.filter((b) => v > b).length;
  const top = [...countries].sort((a, b) => b.value - a.value).slice(0, 6);
  const total = countries.reduce((a, c) => a + c.value, 0) || 1;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Peta sebaran negara asal">
        <path d={base} fill="#d6d3cd" stroke="#fff" strokeWidth={0.6} />
        {countries.filter((c) => c.path).map((c) => <path key={c.name} d={c.path} fill={color(cls(c.value))} stroke="#fff" strokeWidth={0.6}><title>{c.name}</title></path>)}
        {countries.filter((c) => !c.path).map((c) => <circle key={c.name} cx={c.pt[0]} cy={c.pt[1]} r={5} fill={color(cls(c.value))} stroke="#fff" strokeWidth={1.5}><title>{c.name}</title></circle>)}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", fontSize: 10.5, color: MUTED, marginTop: 6 }}>
        <b>Estimasi nilai</b>
        {Array.from({ length: classes }, (_, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 14, height: 9, borderRadius: 2, background: color(i) }} />
            {classes === 1 ? "tercantum" : i === 0 ? `≤ ${legendFormat(bins[0])}` : i === classes - 1 ? `> ${legendFormat(bins[bins.length - 1])}` : `${legendFormat(bins[i - 1])} – ${legendFormat(bins[i])}`}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 14, height: 9, borderRadius: 2, background: "#d6d3cd" }} />tidak tercantum</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${CARD_BORDER}`, fontSize: 11.5 }}>
        {top.map((c) => (
          <div key={c.name} style={{ display: "flex", flexDirection: "column" }}>
            <b>{c.name}</b>
            <span style={{ color: MUTED_2, fontSize: 10.5 }}>{legendFormat(c.value)} · {((c.value / total) * 100).toFixed(1).replace(".", ",")}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 100% stacked horizontal bars (e.g. negara × bab HS composition). */
export function StackBars({ rows, segments, format }: { rows: { label: string; parts: number[]; total: number }[]; segments: string[]; format: (v: number) => string }) {
  const colors = [...SERIES, C.na];
  return (
    <div>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((r) => {
          const t = r.parts.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr 80px", gap: 10, alignItems: "center", fontSize: 11 }}>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
              <span style={{ display: "flex", gap: 1, height: 18, borderRadius: 4, overflow: "hidden" }}>
                {r.parts.map((p, i) =>
                  p > 0 ? (
                    <span key={i} style={{ width: `${(p / t) * 100}%`, minWidth: 2, background: colors[i % colors.length], display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p / t >= 0.12 && <em style={{ fontStyle: "normal", fontSize: 9, fontWeight: 800, color: "#fff" }}>{Math.round((p / t) * 100)}%</em>}
                    </span>
                  ) : null,
                )}
              </span>
              <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{format(r.total)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 10.5, color: MUTED, marginTop: 8 }}>
        {segments.map((s, i) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length] }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Profile cards (one per country): headline figures, top pos tarif and top importers. */
export function ProfileCards({ cards }: { cards: { rank: number; title: string; sub: string; kpis: [string, string][]; listA: { title: string; rows: [string, string][] }; listB: { title: string; rows: [string, string][] } }[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {cards.map((c) => (
        <div key={c.title} style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "10px 14px", breakInside: "avoid" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, background: "#b4561a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>{c.rank}</span>
            <span><b style={{ fontSize: 14, display: "block" }}>{c.title}</b><span style={{ fontSize: 10.5, color: MUTED }}>{c.sub}</span></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${c.kpis.length}, 1fr)`, gap: 6, marginTop: 8 }}>
            {c.kpis.map(([v, l]) => (
              <div key={l} style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: "5px 8px" }}>
                <b style={{ fontSize: 13, display: "block", fontVariantNumeric: "tabular-nums" }}>{v}</b>
                <span style={{ fontSize: 9.5, color: MUTED }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 8 }}>
            {[c.listA, c.listB].map((list) => (
              <div key={list.title}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", color: ORANGE_TEXT, marginBottom: 3 }}>{list.title.toUpperCase()}</div>
                {list.rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, padding: "2px 0", borderTop: `1px solid ${CARD_BORDER}` }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
                    <b style={{ whiteSpace: "nowrap" }}>{v}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
