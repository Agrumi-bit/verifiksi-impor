"use client";

import { useRef, useState } from "react";

import { monthLabel, nf } from "../format";

const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)"];
const W = 720, H = 290, L = 64, R = 20, T = 16, B = 30;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
const tick = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : v >= 1e3 ? `${Math.round(v / 1e3)} rb` : String(Math.round(v)));

/** Monthly line chart with a crosshair tooltip; one y-axis, one unit. */
export function LineChart({ months, series, unit }: { months: string[]; series: { name: string; values: number[] }[]; unit: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(months.length - 1, 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(months.length - 1, Math.round(((px - L) / (W - L - R)) * (months.length - 1)))));
  }

  return (
    <div>
      <div className="series-leg">
        {series.map((s, k) => <span key={s.name}><i style={{ background: COLORS[k % 3] }} />{s.name}</span>)}
      </div>
      <div className="lc">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rencana kebutuhan impor per bulan (${unit})`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((k) => {
            const t = (max * k) / 4;
            return (
              <g key={k}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} style={{ stroke: "var(--line)" }} />
                <text x={L - 8} y={y(t) + 4} textAnchor="end">{tick(t)}</text>
              </g>
            );
          })}
          {months.map((m, i) => (i % 2 === 0 || i === months.length - 1 ? <text key={m} x={x(i)} y={H - 8} textAnchor="middle">{monthLabel(m)}</text> : null))}
          {series.map((s, k) => {
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
            const last = s.values.length - 1;
            return (
              <g key={s.name}>
                {series.length === 1 && <path d={`${d} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`} style={{ fill: COLORS[0] }} opacity={0.12} />}
                <path d={d} fill="none" style={{ stroke: COLORS[k % 3] }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(last)} cy={y(s.values[last] ?? 0)} r={4} style={{ fill: COLORS[k % 3], stroke: "var(--surface)" }} strokeWidth={2} />
              </g>
            );
          })}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} style={{ stroke: "var(--line-strong)" }} />}
          <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
        </svg>
        {hover !== null && (
          <div className="lc-tip" style={{ left: `min(calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 180px))` }}>
            <b>{monthLabel(months[hover])}</b>
            {series.map((s, k) => (
              <div key={s.name}><span style={{ color: COLORS[k % 3] }}>● </span>{s.name}<span>{nf(Math.round(s.values[hover]))} {unit}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
