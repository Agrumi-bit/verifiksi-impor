"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import DOMPurify from "dompurify";

/**
 * Lays the report content out on real A4 sheets (210 × 297 mm), on screen and in print alike.
 *
 * The content is a flat list of items: React blocks (tables, cards, headings — kept whole) and
 * "notes" (the analysts' rich-text Catatan/Keterangan/Kesimpulan). A note is split into its
 * top-level paragraphs/lists/tables, and a rich-text table into its rows, so a long analysis flows
 * over as many sheets as it needs ("… (lanjutan)" on the next sheet, table header repeated).
 * Every piece is measured in a hidden sheet of the same width, then packed greedily into pages.
 */
export type FlowItem =
  | { kind: "node"; key: string; node: ReactNode; breakBefore?: boolean }
  | {
      kind: "note";
      key: string;
      label: string;
      html: string;
      breakBefore?: boolean;
    };

type NoteInfo = { key: string; label: string };
type TableInfo = {
  key: string;
  open: string;
  colgroup: string;
  head: string;
  headInThead: boolean;
};
type Unit =
  | { t: "node"; id: string; node: ReactNode; breakBefore: boolean }
  | {
      t: "html";
      id: string;
      note: NoteInfo;
      html: string;
      firstOfNote: boolean;
      breakBefore: boolean;
    }
  | {
      t: "row";
      id: string;
      note: NoteInfo;
      table: TableInfo;
      row: string;
      firstOfNote: boolean;
      breakBefore: boolean;
    };

const SANITIZE = { ADD_ATTR: ["target"] };

export function textToHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${esc.replace(/\n/g, "<br>")}</p>`;
}

function tableHtml(t: TableInfo, rows: readonly string[]): string {
  const body = t.headInThead ? `${t.head}<tbody>${rows.join("")}</tbody>` : `<tbody>${t.head}${rows.join("")}</tbody>`;
  return `${t.open}${t.colgroup}${body}</table>`;
}

type Piece = { html: string } | { table: Omit<TableInfo, "key">; row: string };

function splitHtml(html: string): Piece[] {
  if (typeof window === "undefined") return [{ html }];
  const doc = new DOMParser().parseFromString(`<div>${DOMPurify.sanitize(html, SANITIZE)}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [];
  const pieces: Piece[] = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) pieces.push({ html: textToHtml(node.textContent.trim()) });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.tagName === "TABLE") {
      const thead = el.querySelector(":scope > thead");
      const rows = [...el.querySelectorAll(":scope > tbody > tr, :scope > tr")];
      let head = thead?.outerHTML ?? "";
      let headInThead = Boolean(thead);
      if (!thead && rows.length > 0 && [...rows[0].children].every((c) => c.tagName === "TH")) {
        head = rows.shift()!.outerHTML;
        headInThead = false;
      }
      if (rows.length > 1) {
        const open = el.outerHTML.match(/^<table[^>]*>/i)?.[0] ?? "<table>";
        const colgroup = el.querySelector(":scope > colgroup")?.outerHTML ?? "";
        for (const row of rows)
          pieces.push({
            table: { open, colgroup, head, headInThead },
            row: row.outerHTML,
          });
        return;
      }
    }
    pieces.push({ html: el.outerHTML });
  });
  return pieces;
}

function buildUnits(items: readonly FlowItem[]): {
  units: Unit[];
  tables: TableInfo[];
  notes: NoteInfo[];
} {
  const units: Unit[] = [];
  const tables: TableInfo[] = [];
  const notes: NoteInfo[] = [];
  for (const item of items) {
    const breakBefore = Boolean(item.breakBefore);
    if (item.kind === "node") {
      units.push({
        t: "node",
        id: `n:${item.key}`,
        node: item.node,
        breakBefore,
      });
      continue;
    }
    const note = { key: item.key, label: item.label };
    notes.push(note);
    const pieces = splitHtml(item.html);
    if (pieces.length === 0) pieces.push({ html: "<p>—</p>" });
    let currentTable: TableInfo | null = null;
    let lastOpen = "";
    pieces.forEach((p, i) => {
      const common = {
        note,
        firstOfNote: i === 0,
        breakBefore: breakBefore && i === 0,
      };
      if ("html" in p) {
        currentTable = null;
        units.push({
          t: "html",
          id: `h:${item.key}:${i}`,
          html: p.html,
          ...common,
        });
        return;
      }
      if (!currentTable || lastOpen !== p.table.open + p.table.head) {
        currentTable = { key: `${item.key}:t${i}`, ...p.table };
        tables.push(currentTable);
        lastOpen = p.table.open + p.table.head;
      }
      units.push({
        t: "row",
        id: `r:${item.key}:${i}`,
        row: p.row,
        table: currentTable,
        ...common,
      });
    });
  }
  return { units, tables, notes };
}

function NoteBox({ label, html, continued }: { label: string; html: string; continued: boolean }) {
  return (
    <div className="rd-note" style={{ marginTop: 14 }}>
      <div className="rd-note-label">
        {label}
        {continued ? " (lanjutan)" : ""}
      </div>
      <div className="rd-note-body" style={{ fontSize: 12.5 }}>
        <div className="rte-html" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

function renderUnits(units: readonly Unit[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < units.length) {
    const u = units[i];
    if (u.t === "node") {
      out.push(<Fragment key={u.id}>{u.node}</Fragment>);
      i++;
      continue;
    }
    const group: Exclude<Unit, { t: "node" }>[] = [];
    while (i < units.length) {
      const g = units[i];
      if (g.t === "node" || g.note.key !== u.note.key) break;
      group.push(g);
      i++;
    }
    let html = "";
    let j = 0;
    while (j < group.length) {
      const g = group[j];
      if (g.t === "row") {
        const rows: string[] = [];
        while (j < group.length) {
          const r = group[j];
          if (r.t !== "row" || r.table.key !== g.table.key) break;
          rows.push(r.row);
          j++;
        }
        html += tableHtml(g.table, rows);
      } else {
        html += g.html;
        j++;
      }
    }
    out.push(<NoteBox key={group[0].id} label={u.note.label} html={html} continued={!group[0].firstOfNote} />);
  }
  return out;
}

const SAFETY_PX = 6;

export function A4Pages({
  items,
  renderPage,
}: {
  items: readonly FlowItem[];
  /** One A4 sheet: page chrome around `children` (the page's content). */
  renderPage: (pageNo: number, total: number, children: ReactNode) => ReactNode;
}) {
  const { units, tables, notes } = useMemo(() => buildUnits(items), [items]);
  const measureRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);
  const [pages, setPages] = useState<Unit[][] | null>(null);

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setVersion((v) => v + 1));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const h = (id: string) => root.querySelector<HTMLElement>(`[data-mid="${CSS.escape(id)}"]`)?.offsetHeight ?? 0;
    const sheet = root.querySelector<HTMLElement>("[data-a4]")?.offsetHeight ?? 1123;
    const head = root.querySelector<HTMLElement>(".rd-pagehead")?.offsetHeight ?? 0;
    const foot = root.querySelector<HTMLElement>(".rd-pagefoot")?.offsetHeight ?? 0;
    const body = root.querySelector<HTMLElement>(".rd-body");
    const padTop = body ? parseFloat(getComputedStyle(body).paddingTop) || 0 : 0;
    const budget = sheet - head - foot - padTop - SAFETY_PX;

    // A row is measured as a one-row table: its own height is that minus the header-only table.
    const cost = (u: Unit, note: string | null, table: string | null) => {
      let c = u.t === "row" ? Math.max(0, h(u.id) - h(`th:${u.table.key}`)) : h(u.id);
      if (u.t !== "node") {
        if (note !== u.note.key) c += h(`nc:${u.note.key}`);
        if (u.t === "row" && table !== u.table.key) c += h(`th:${u.table.key}`);
      }
      return c;
    };
    const out: Unit[][] = [];
    let cur: Unit[] = [];
    let used = 0;
    let note: string | null = null;
    let table: string | null = null;
    const flush = () => {
      out.push(cur);
      cur = [];
      used = 0;
      note = null;
      table = null;
    };
    for (const u of units) {
      if (u.breakBefore && cur.length) flush();
      let c = cost(u, note, table);
      if (used + c > budget && cur.length) {
        flush();
        c = cost(u, null, null);
      }
      cur.push(u);
      used += c;
      note = u.t === "node" ? null : u.note.key;
      table = u.t === "row" ? u.table.key : null;
    }
    if (cur.length || out.length === 0) out.push(cur);
    setPages(out);
  }, [units, version]);

  const measureWrap = (id: string, node: ReactNode) => (
    <div key={id} data-mid={id} style={{ display: "flow-root" }}>
      {node}
    </div>
  );
  const measureHtml = (html: string) => (
    <div className="rd-note" style={{ marginTop: 0, paddingTop: 0, paddingBottom: 0 }}>
      <div className="rd-note-body" style={{ fontSize: 12.5 }}>
        {/* trailing block: the piece is never :last-child here, as it isn't in the merged note */}
        <div
          className="rte-html"
          style={{ display: "flow-root" }}
          dangerouslySetInnerHTML={{
            __html: `${html}<div style="height:0"></div>`,
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden
        className="rd-a4-measure"
        onLoadCapture={() => setVersion((v) => v + 1)}
        style={{
          position: "absolute",
          left: -100000,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div data-a4 style={{ height: "297mm", width: 1 }} />
        {renderPage(
          1,
          1,
          <>
            {units.map((u) =>
              u.t === "node"
                ? measureWrap(u.id, u.node)
                : u.t === "html"
                  ? measureWrap(u.id, measureHtml(u.html))
                  : measureWrap(u.id, measureHtml(tableHtml(u.table, [u.row]))),
            )}
            {tables.map((t) => measureWrap(`th:${t.key}`, measureHtml(tableHtml(t, []))))}
            {notes.map((n) =>
              measureWrap(
                `nc:${n.key}`,
                <div className="rd-note" style={{ marginTop: 14 }}>
                  <div className="rd-note-label">{n.label} (lanjutan)</div>
                  <div className="rd-note-body" />
                </div>,
              ),
            )}
          </>,
        )}
      </div>

      {pages === null ? (
        <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Menyusun halaman A4…</p>
      ) : (
        <>
          {pages.map((page, i) => (
            <Fragment key={i}>{renderPage(i + 1, pages.length, renderUnits(page))}</Fragment>
          ))}
          {/* the server-side "Unduh PDF" waits for this before printing */}
          <span data-a4-ready hidden />
        </>
      )}
    </>
  );
}
