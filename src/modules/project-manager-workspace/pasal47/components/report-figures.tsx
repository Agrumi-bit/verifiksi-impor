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
export function Donut({ segs, center, sub, size = 132 }: { segs: { label: string; value: number; color: string; note?: string }[]; center: string; sub?: string; size?: number }) {
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
          <b style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{center}</b>
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
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{nf(s.value)}</b>
            <small style={{ minWidth: 40, textAlign: "right", color: MUTED_2, fontSize: 10.5 }}>{Math.round((s.value / total) * 100)}%</small>
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
