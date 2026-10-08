"use client";

import type { ReactNode } from "react";

import { nf } from "../format";
import { MaterialIcon } from "../../components/material-icon";
import type { Tone } from "../types";

export type BadgeTone = Tone | "sev" | "mat";

export function Badge({ children, tone = "na", plain = false }: { children: ReactNode; tone?: BadgeTone; plain?: boolean }) {
  return <span className={`badge ${tone}${plain ? " plain" : ""}`}>{children}</span>;
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="tip" tabIndex={0} data-tip={text} aria-label={text}>
      ?
    </span>
  );
}

export function Kpi({ label, value, sub, tone, tip }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; tip?: string }) {
  return (
    <div className={`card kpi ${tone ?? ""}`}>
      <div className="k-l">
        {label}
        {tip && <Tip text={tip} />}
      </div>
      <div className="k-v">{typeof value === "number" ? nf(value) : value}</div>
      {sub && <div className="k-s">{sub}</div>}
    </div>
  );
}

export function Banner({ kind, title, children }: { kind: "info" | "warn" | "na"; title: string; children: ReactNode }) {
  return (
    <div className={`banner ${kind}`}>
      <MaterialIcon name={kind === "info" ? "info" : kind === "warn" ? "warning" : "do_not_disturb_on"} className="text-[18px]" />
      <div>
        <b>{title}</b> {children}
      </div>
    </div>
  );
}

export function H2({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="h2row">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Seg<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, caption, tip, right, children }: { title: string; caption?: string; tip?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      <h3>
        {title}
        {tip && <Tip text={tip} />}
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </h3>
      {caption && <p className="cap">{caption}</p>}
      {children}
    </div>
  );
}

export type BarItem = { label: string; v: number; onClick?: () => void };

/** Ranked horizontal bars; one hue, values and shares as text. */
export function HBar({ items, total, fmt = nf, empty = "Belum ada data." }: { items: BarItem[]; total?: number; fmt?: (v: number) => string; empty?: string }) {
  if (items.length === 0) return <div className="empty">{empty}</div>;
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <div>
      {items.map((i, k) => {
        const content = (
          <>
            <span className="hb-rank">{k + 1}</span>
            <span className="hb-label">{i.label}</span>
            <span className="hb-track">
              <span className="hb-bar" style={{ width: `${(i.v / max) * 100}%` }} />
            </span>
            <span className="hb-val">
              {fmt(i.v)}
              {total ? <em>{Math.round((i.v / total) * 100)}%</em> : null}
            </span>
          </>
        );
        const title = `${i.label}: ${fmt(i.v)}${total ? ` (${((i.v / total) * 100).toFixed(1)}%)` : ""}`;
        return i.onClick ? (
          <button key={i.label} type="button" className="hb-row" title={title} onClick={i.onClick}>
            {content}
          </button>
        ) : (
          <div key={i.label} className="hb-row" title={title}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export type Segment = { label: string; v: number; color: string };

export function Donut({ segments, caption }: { segments: Segment[]; caption: string }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  const lens = segments.map((s) => (total ? (s.v / total) * 100 : 0));
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="donut-wrap">
      <svg width="132" height="132" viewBox="0 0 42 42" role="img" aria-label={caption}>
        {total === 0 && <circle r="15.9155" cx="21" cy="21" fill="none" style={{ stroke: "var(--surface-2)" }} strokeWidth="6" />}
        {segments.map((s, i) => {
          const dash = Math.max(lens[i] - 0.8, 0);
          return (
            <circle key={s.label} r="15.9155" cx="21" cy="21" fill="none" style={{ stroke: s.color }} strokeWidth="6" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={25 - offsets[i]}>
              <title>{`${s.label}: ${s.v}`}</title>
            </circle>
          );
        })}
        <text x="21" y="21.5" textAnchor="middle" fontSize="8" fontWeight="700" style={{ fill: "var(--ink)" }}>
          {total}
        </text>
        <text x="21" y="27" textAnchor="middle" fontSize="3.2" style={{ fill: "var(--ink-3)" }}>
          {caption}
        </text>
      </svg>
      <div className="legend">
        {segments.map((s) => (
          <div key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
            <b>{s.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackBar({ label, unit, segments }: { label: string; unit: string; segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  return (
    <div className="stack-row">
      <div className="sl">
        <span>{label}</span>
        <span style={{ color: "var(--ink-3)" }}>
          {total} {unit}
        </span>
      </div>
      <div className="stack">
        {segments.filter((s) => s.v).map((s) => (
          <span key={s.label} style={{ flex: s.v, background: s.color }} title={`${s.label}: ${s.v}`} />
        ))}
      </div>
      <div className="legend" style={{ flexDirection: "row", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ flex: "none" }}>
            <i style={{ background: s.color }} />
            {s.label} <b style={{ marginLeft: 6 }}>{s.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export const COLOR = { ok: "#17803f", warn: "#d9a015", bad: "#bf3224", badDark: "#7d2a21", na: "#8c95a5" };
export const Na = ({ children }: { children: ReactNode }) => <span className="na-t">{children}</span>;
