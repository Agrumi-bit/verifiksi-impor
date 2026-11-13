import type { ReactNode } from "react";

import type { FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import type { VkiForm, VkiFormBlock } from "@/modules/applications/vki-form/model";

function Table({ block, indices, continued }: { block: Extract<VkiFormBlock, { kind: "table" | "fields" }>; indices: readonly number[]; continued: boolean }) {
  const isFields = block.kind === "fields";
  const headers = isFields ? null : block.headers;
  const widths = isFields ? [40, 60] : block.widths;
  const rows = block.rows;
  const numeric = isFields ? [] : (block.numeric ?? []);
  const center = isFields ? [] : (block.center ?? []);
  const cls = (i: number) => (numeric.includes(i) ? "num" : center.includes(i) ? "ctr" : undefined);
  const total = widths.reduce((a, b) => a + b, 0);
  return (
    <table className={isFields ? "vf-table vf-fields" : "vf-table"}>
      <colgroup>
        {widths.map((w, i) => (
          <col key={i} style={{ width: `${(w / total) * 100}%` }} />
        ))}
      </colgroup>
      {headers && (
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={cls(i)}>
                {h}
                {continued && i === 1 ? " (lanjutan)" : ""}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={widths.length} className="vf-empty">
              Tidak ada data pada sistem.
            </td>
          </tr>
        ) : (
          indices.map((index) => (
            <tr key={index}>
              {rows[index].map((c, i) => (
                <td key={i} className={cls(i)}>
                  {c}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function blockNode(b: VkiFormBlock): ReactNode {
  switch (b.kind) {
    case "title":
      return (
        <div className="vf-title">
          {b.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      );
    case "heading":
      return <div className="vf-h">{b.text}</div>;
    case "subheading":
      return <div className="vf-sh">{b.text}</div>;
    case "para":
      return (
        <p className={["vf-p", b.align === "center" ? "vf-center" : b.align === "left" ? "vf-left" : "", b.italic ? "vf-italic" : ""].join(" ")} style={b.bold ? { fontWeight: 700 } : undefined}>
          {b.text}
        </p>
      );
    case "sign":
      return (
        <div className="vf-sign">
          <div>{b.dateLine}</div>
          <div>{b.role}</div>
          <div className="vf-sign-note">{b.note}</div>
          <div className="vf-sign-name">{b.name}</div>
        </div>
      );
    default:
      return null;
  }
}

/** Kop surat PT Tribhakti Inspektama — repeated at the top of every A4 sheet with its page number. */
export function VkiFormKop({ form, pageNo, total }: { form: VkiForm; pageNo?: number; total?: number }) {
  const rows: [string, string][] = [...form.kop.rows, ["Halaman", pageNo && total ? `${pageNo} dari ${total}` : "—"]];
  return (
    <div className="vf-kop">
      <div className="vf-kop-logo">
        {/* eslint-disable-next-line @next/next/no-img-element -- printed sheet, plain img keeps print/PDF simple */}
        <img src={form.kop.logoPath} alt={form.kop.logoAlt} />
      </div>
      <table className="vf-kop-doc">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The form as A4 flow items: headings travel with what follows, tables split row by row (header repeated). */
export function vkiFormFlow(form: VkiForm): FlowItem[] {
  // The kop is page chrome (see the Sheet in vki-form-report.tsx), not part of the flow.
  const items: FlowItem[] = [];
  let pendingLead: ReactNode[] = [];
  let breakNext = false;
  const flushLead = (key: string) => {
    if (pendingLead.length === 0) return;
    items.push({ kind: "node", key: `${key}-lead`, node: <>{pendingLead}</>, breakBefore: breakNext });
    pendingLead = [];
    breakNext = false;
  };
  form.blocks.forEach((b, i) => {
    const key = `b${i}`;
    if (b.kind === "pagebreak") {
      flushLead(key);
      breakNext = true;
      return;
    }
    if (b.kind === "heading" || b.kind === "subheading") {
      // Kept with the next block so a heading never ends a sheet on its own.
      pendingLead.push(<div key={key}>{blockNode(b)}</div>);
      return;
    }
    if (b.kind === "table" || b.kind === "fields") {
      const lead = pendingLead.length ? <>{pendingLead}</> : undefined;
      pendingLead = [];
      items.push({
        kind: "rows",
        key,
        count: Math.max(b.rows.length, 1),
        lead,
        breakBefore: breakNext,
        render: (indices, continued) => <Table block={b} indices={indices} continued={continued} />,
      });
      breakNext = false;
      return;
    }
    const node = blockNode(b);
    if (pendingLead.length) {
      pendingLead.push(<div key={key}>{node}</div>);
      flushLead(key);
      return;
    }
    items.push({ kind: "node", key, node, breakBefore: breakNext });
    breakNext = false;
  });
  flushLead("end");
  return items;
}

/** The whole form on one continuous page (Admin detail "Formulir" view). */
export function VkiFormInline({ form }: { form: VkiForm }) {
  return (
    <div className="vf-form">
      <VkiFormKop form={form} />
      {form.blocks.map((b, i) =>
        b.kind === "pagebreak" ? (
          <hr key={i} className="my-6 border-dashed" />
        ) : b.kind === "table" || b.kind === "fields" ? (
          <Table key={i} block={b} indices={b.rows.map((_, r) => r)} continued={false} />
        ) : (
          <div key={i}>{blockNode(b)}</div>
        ),
      )}
    </div>
  );
}
