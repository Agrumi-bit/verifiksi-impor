"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";

export type Column<R> = {
  key: string;
  label: string;
  /** Cell content; defaults to the plain text value. */
  render?: (row: R) => ReactNode;
  /** Plain value for search, sort and "Export tampilan ini". */
  value: (row: R) => string | number | null;
  num?: boolean;
  mono?: boolean;
  /** Hidden until switched on in "Kolom". */
  hidden?: boolean;
};

type Props<R> = {
  columns: Column<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  onRowClick?: (row: R) => void;
  /** Header group row: [label, colspan, className]. */
  groups?: [string, number, string?][];
  pageSize?: number;
  exportName: string;
  empty?: string;
};

/** Sortable, searchable, paginated table with column visibility and an Excel export of the current view. */
export function DataTable<R>({ columns, rows, rowKey, onRowClick, groups, pageSize = 8, exportName, empty }: Props<R>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter((c) => c.hidden).map((c) => c.key)));
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const visible = columns.filter((c) => !hidden.has(c.key));
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle ? rows.filter((r) => columns.some((c) => String(c.value(r) ?? "").toLowerCase().includes(needle))) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const A = col.value(a), B = col.value(b);
          if (A === B) return 0;
          if (A === null || A === "" || (typeof A === "number" && Number.isNaN(A))) return 1;
          if (B === null || B === "" || (typeof B === "number" && Number.isNaN(B))) return -1;
          return (A > B ? 1 : -1) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, columns, q, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  function exportView() {
    const sheet = XLSX.utils.aoa_to_sheet([visible.map((c) => c.label), ...filtered.map((r) => visible.map((c) => c.value(r) ?? ""))]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, exportName.slice(0, 31));
    XLSX.writeFile(book, `${exportName}.xlsx`);
  }

  return (
    <div className="tblbox">
      <div className="tbl-tools">
        <input type="search" placeholder="Cari di tabel…" aria-label="Cari di tabel" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span style={{ flex: 1 }} />
        <div className="menu-wrap" ref={menuRef}>
          <button className="btn sm" type="button" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>Kolom ▾</button>
          {menu && (
            <div className="menu">
              {columns.map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={!hidden.has(c.key)} onChange={(e) => setHidden((h) => { const n = new Set(h); if (e.target.checked) n.delete(c.key); else n.add(c.key); return n; })} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className="btn sm" type="button" onClick={exportView} disabled={filtered.length === 0}>Export tampilan ini</button>
      </div>
      <div className="tscroll">
        <table>
          <thead>
            {groups && (
              <tr className="grp">
                {groups.map(([label, span, cls], i) => <th key={i} colSpan={span} className={cls}>{label}</th>)}
              </tr>
            )}
            <tr>
              {visible.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={c.num ? "num" : ""} aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : undefined}>
                    <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                      {c.label}
                      <span className="ar">{active ? (sort!.dir === 1 ? "▲" : "▼") : "↕"}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={rowKey(r)}
                className={onRowClick ? "clickable" : ""}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(r); } } : undefined}
              >
                {visible.map((c) => (
                  <td key={c.key} className={`${c.num ? "num" : ""} ${c.mono ? "mono" : ""}`}>{c.render ? c.render(r) : String(c.value(r) ?? "—")}</td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={visible.length}><div className="empty">{empty ?? "Tidak ada data untuk periode dan filter ini."}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="tbl-foot">
        <span>Menampilkan {filtered.length ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, filtered.length)} dari {filtered.length} baris</span>
        {pages > 1 && (
          <div className="pager">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Sebelumnya">‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" aria-current={i + 1 === current ? "page" : undefined} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Berikutnya">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
