import { deflateRawSync } from "node:zlib";

import type { VkiForm, VkiFormBlock } from "./model";

/**
 * Formulir Permohonan VKI → Word (.docx), written by hand (WordprocessingML + a small zip writer)
 * so no extra dependency is needed. Same block model as the A4 page.
 */

const PAGE_W = 11906; // A4, twips
const PAGE_H = 16838;
const MARGIN = 1134; // 2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type RunStyle = { bold?: boolean; italic?: boolean; underline?: boolean; size?: number; color?: string };

function runs(text: string, style: RunStyle = {}): string {
  const rPr = [
    style.bold ? "<w:b/>" : "",
    style.italic ? "<w:i/>" : "",
    style.underline ? '<w:u w:val="single"/>' : "",
    style.color ? `<w:color w:val="${style.color}"/>` : "",
    style.size ? `<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>` : "",
  ].join("");
  return text
    .split("\n")
    .map((line, i) => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}${i > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`)
    .join("");
}

type ParaOpts = RunStyle & { align?: "left" | "center" | "right" | "both"; before?: number; after?: number; keepNext?: boolean; border?: boolean };

function para(text: string, o: ParaOpts = {}): string {
  const pPr = [
    o.keepNext ? "<w:keepNext/>" : "",
    o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="000000"/></w:pBdr>' : "",
    `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 120}"/>`,
    o.align ? `<w:jc w:val="${o.align}"/>` : "",
  ].join("");
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs(text, o)}</w:p>`;
}

const BORDERS =
  '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="808080"/><w:left w:val="single" w:sz="4" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:color="808080"/><w:right w:val="single" w:sz="4" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:color="808080"/></w:tblBorders>';

function cell(text: string, width: number, o: { shade?: string; bold?: boolean; align?: "left" | "center" | "right"; span?: number; italic?: boolean } = {}): string {
  const tcPr = `<w:tcW w:w="${width}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ""}${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ""}`;
  return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${para(text, { bold: o.bold, italic: o.italic, align: o.align, after: 0, size: 18 })}</w:tc>`;
}

function table(widthsPct: number[], header: string[] | null, rows: { cells: string[]; shadeFirst?: boolean }[], numeric: number[] = [], center: number[] = []): string {
  const total = widthsPct.reduce((a, b) => a + b, 0);
  const widths = widthsPct.map((w) => Math.round((w / total) * CONTENT_W));
  const grid = `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
  const tblPr = `<w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/>${BORDERS}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const alignOf = (i: number) => (numeric.includes(i) ? "right" : center.includes(i) ? "center" : undefined);
  const head = header
    ? `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${header.map((h, i) => cell(h, widths[i], { shade: "D9D9D9", bold: true, align: alignOf(i) })).join("")}</w:tr>`
    : "";
  const body =
    rows.length === 0
      ? `<w:tr>${cell("Tidak ada data pada sistem.", CONTENT_W, { span: widths.length, italic: true })}</w:tr>`
      : rows
          .map(
            (r) =>
              `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.cells
                .map((c, i) => cell(c, widths[i], { shade: r.shadeFirst && i === 0 ? "F2F2F2" : undefined, bold: r.shadeFirst && i === 0, align: alignOf(i) }))
                .join("")}</w:tr>`,
          )
          .join("");
  return `<w:tbl>${tblPr}${grid}${head}${body}</w:tbl>${para("", { after: 120 })}`;
}

function block(b: VkiFormBlock): string {
  switch (b.kind) {
    case "title":
      return b.lines.map((l, i) => para(l, { bold: true, align: "center", size: 24, before: i === 0 ? 200 : 0, after: i === b.lines.length - 1 ? 160 : 0 })).join("");
    case "heading":
      return para(b.text, { bold: true, size: 22, before: 240, after: 120, keepNext: true });
    case "subheading":
      return para(b.text, { bold: true, before: 120, after: 80, keepNext: true });
    case "para":
      return para(b.text, { italic: b.italic, bold: b.bold, align: b.align === "center" ? "center" : b.align === "left" ? "left" : "both" });
    case "fields":
      return table([40, 60], null, b.rows.map((r) => ({ cells: r, shadeFirst: true })));
    case "table":
      return table(b.widths, b.headers, b.rows.map((cells) => ({ cells })), b.numeric, b.center);
    case "sign":
      return [
        para(b.dateLine, { before: 240, after: 0, keepNext: true }),
        para(b.role, { after: 0, keepNext: true }),
        para("", { after: 0, keepNext: true }),
        para(b.note, { italic: true, color: "808080", size: 16, after: 0, keepNext: true }),
        para("", { after: 0, keepNext: true }),
        para(b.name, { bold: true, underline: true, after: 200 }),
      ].join("");
    case "pagebreak":
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
}

function documentXml(form: VkiForm): string {
  const kop = form.kopLines
    .map((l, i) =>
      para(l, { bold: i === 0, size: i === 0 ? 28 : 18, align: "center", after: 0, border: i === form.kopLines.length - 1 }),
    )
    .join("");
  const body = kop + para("", { after: 120 }) + form.blocks.map(block).join("");
  const sect = `<w:sectPr><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

// ---------- minimal zip (deflate) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { name: string; data: string | Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const raw = typeof f.data === "string" ? Buffer.from(f.data, "utf8") : f.data;
    const packed = deflateRawSync(raw);
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0, 10); // time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, packed);
    centrals.push(central, name);
    offset += local.length + name.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

export function vkiFormToDocx(form: VkiForm): Buffer {
  return zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: ROOT_RELS },
    { name: "word/document.xml", data: documentXml(form) },
    { name: "word/styles.xml", data: STYLES },
    { name: "word/_rels/document.xml.rels", data: DOC_RELS },
  ]);
}
