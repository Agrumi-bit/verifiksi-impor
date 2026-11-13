import { readFileSync } from "node:fs";
import path from "node:path";
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

// ---------- kop surat (page header on every page) ----------
const ORANGE = "E36C0A";
const LOGO_W_EMU = 1872000; // 5.2 cm
const LOGO_H_EMU = Math.round((LOGO_W_EMU * 107) / 288); // logo-tribhakti.png is 288×107 px

/** The Tribhakti logo from public/ (copied into the production image); the header drops it if missing. */
function readLogo(logoPath: string): Buffer | null {
  try {
    return readFileSync(path.join(process.cwd(), "public", logoPath.replace(/^\/+/, "")));
  } catch {
    return null;
  }
}

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

function logoDrawing(alt: string): string {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${LOGO_W_EMU}" cy="${LOGO_H_EMU}"/><wp:docPr id="1" name="Logo" descr="${esc(alt)}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo-tribhakti.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${LOGO_W_EMU}" cy="${LOGO_H_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

const field = (instr: string) =>
  `<w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;

function headerXml(form: VkiForm, hasLogo: boolean): string {
  const LOGO_COL = 5800;
  const LABEL_COL = 1700;
  const VALUE_COL = CONTENT_W - LOGO_COL - LABEL_COL;
  const white = 'w:val="single" w:sz="6" w:space="0" w:color="FFFFFF"';
  const docCell = (w: number, content: string, align: "left" | "center") =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders><w:top ${white}/><w:left ${white}/><w:bottom ${white}/><w:right ${white}/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${ORANGE}"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${align}"/></w:pPr>${content}</w:p></w:tc>`;
  const text = (v: string) => runs(v, { bold: true, color: "FFFFFF", size: 16 });
  const rows: [string, string | null][] = [...form.kop.rows, ["Halaman", null]];
  const none = 'w:val="nil"';
  const trs = rows
    .map(([label, value], i) => {
      const logoCell =
        i === 0
          ? `<w:tc><w:tcPr><w:tcW w:w="${LOGO_COL}" w:type="dxa"/><w:vMerge w:val="restart"/><w:tcBorders><w:top ${none}/><w:left ${none}/><w:bottom ${none}/><w:right ${none}/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${hasLogo ? logoDrawing(form.kop.logoAlt) : runs("TRIBHAKTI", { bold: true, size: 32 })}</w:p></w:tc>`
          : `<w:tc><w:tcPr><w:tcW w:w="${LOGO_COL}" w:type="dxa"/><w:vMerge/><w:tcBorders><w:top ${none}/><w:left ${none}/><w:bottom ${none}/><w:right ${none}/></w:tcBorders></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc>`;
      const valueContent = value === null ? `${field("PAGE")}${text(" dari ")}${field("NUMPAGES")}` : text(value);
      return `<w:tr>${logoCell}${docCell(LABEL_COL, text(label), "left")}${docCell(VALUE_COL, valueContent, "center")}</w:tr>`;
    })
    .join("");
  const table = `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${LOGO_COL}"/><w:gridCol w:w="${LABEL_COL}"/><w:gridCol w:w="${VALUE_COL}"/></w:tblGrid>${trs}</w:tbl>`;
  const rule = '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${table}${rule}</w:hdr>`;
}

function documentXml(form: VkiForm): string {
  const body = form.blocks.map(block).join("");
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN + 1300}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`;
const HEADER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo-tribhakti.png"/></Relationships>`;

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
  const logo = readLogo(form.kop.logoPath);
  return zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: ROOT_RELS },
    { name: "word/document.xml", data: documentXml(form) },
    { name: "word/styles.xml", data: STYLES },
    { name: "word/_rels/document.xml.rels", data: DOC_RELS },
    { name: "word/header1.xml", data: headerXml(form, Boolean(logo)) },
    ...(logo ? [{ name: "word/_rels/header1.xml.rels", data: HEADER_RELS }, { name: "word/media/logo-tribhakti.png", data: logo }] : []),
  ]);
}
