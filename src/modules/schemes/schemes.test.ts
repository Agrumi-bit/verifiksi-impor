import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  SCHEME_IDS,
  canFinalizeReport,
  findDocumentDef,
  findForbiddenTerms,
  getScheme,
  isDocumentApplicable,
  resolveDocumentRequirement,
  resolveReportContent,
  resolveScheme,
  resolveSchemeDocuments,
  resolveSchemes,
  validateViuKbli,
  type SchemeId,
} from "./index";

const VIU: SchemeId[] = ["VIU_BAHAN_BAKU_INDUSTRI", "VIU_BAHAN_BAKU_NON_INDUSTRI", "VIU_KONSUMSI"];

describe("resolveSchemes", () => {
  it("VKI → [VKI] regardless of importTypes", () => {
    assert.deepEqual(resolveSchemes({ verificationType: "VKI", importTypes: ["BARANG_KONSUMSI"] }), ["VKI"]);
  });
  it("VIU → one scheme per import type, fixed order", () => {
    assert.deepEqual(
      resolveSchemes({ verificationType: "VIU", importTypes: ["BARANG_KONSUMSI", "BAHAN_BAKU_INDUSTRI"] }),
      ["VIU_BAHAN_BAKU_INDUSTRI", "VIU_KONSUMSI"],
    );
  });
  it("unknown / empty never falls back to VKI", () => {
    assert.deepEqual(resolveSchemes({ verificationType: "VIU", importTypes: [] }), []);
    assert.deepEqual(resolveSchemes({}), []);
    assert.equal(resolveScheme({}).family, null);
  });
  it("multi-import-type VIU is flagged", () => {
    const r = resolveScheme({ verificationType: "VIU", importTypes: ["BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"] });
    assert.equal(r.isMulti, true);
    assert.equal(r.family, "VIU");
  });
});

describe("scheme document definitions", () => {
  for (const id of SCHEME_IDS) {
    const scheme = getScheme(id);
    it(`${id}: unique ids, labels and legal basis present`, () => {
      const ids = scheme.documents.map((d) => d.id);
      assert.equal(new Set(ids).size, ids.length, "duplicate document id");
      for (const d of scheme.documents) {
        assert.ok(d.label.trim(), `${d.id} has no label`);
        assert.ok(d.keyPatterns.length > 0, `${d.id} has no key pattern`);
        if (d.legalBasis.kind === "INTERNAL_LVI") assert.ok(d.legalBasis.note, `${d.id} internal basis needs a note`);
        else assert.match(d.legalBasis.citation, /^Pasal \d+/, `${d.id} citation`);
      }
    });
  }

  it("VKI cites only VKI articles (Ps 8, 25, 30–36), VIU only VIU articles (Ps 26, 37–40)", () => {
    const articles = (id: SchemeId) =>
      getScheme(id).documents.flatMap((d) => [...`${d.legalBasis.citation} ${d.legalBasis.note ?? ""}`.matchAll(/Pasal (\d+)/g)].map((m) => Number(m[1])));
    for (const n of articles("VKI")) assert.ok([8, 25, 30, 31, 32, 33, 34, 35, 36].includes(n), `VKI cites Pasal ${n}`);
    for (const id of VIU) for (const n of articles(id)) assert.ok([26, 37, 38, 39, 40].includes(n), `${id} cites Pasal ${n}`);
  });

  it("each VIU scheme cites only its own huruf of Pasal 37 ayat (2)", () => {
    const own: Record<string, string> = { VIU_BAHAN_BAKU_INDUSTRI: "a", VIU_BAHAN_BAKU_NON_INDUSTRI: "b", VIU_KONSUMSI: "c" };
    for (const id of VIU) {
      for (const d of getScheme(id).documents) {
        for (const m of `${d.legalBasis.citation}`.matchAll(/Pasal 37 ayat \(2\) huruf ([abc])/g)) {
          assert.equal(m[1], own[id], `${id} ${d.id} cites huruf ${m[1]}`);
        }
      }
    }
  });

  it("warehouse lease minimum: Industri 2 tahun, others 1 tahun", () => {
    const note = (id: SchemeId) => getScheme(id).documents.find((d) => d.id === "location-tenure-gudang")!.legalBasis.note!;
    assert.match(note("VIU_BAHAN_BAKU_INDUSTRI"), /2 \(dua\) tahun/);
    assert.match(note("VIU_BAHAN_BAKU_NON_INDUSTRI"), /1 \(satu\) tahun/);
    assert.match(note("VIU_KONSUMSI"), /1 \(satu\) tahun/);
  });
});

describe("no cross-scheme keys", () => {
  const foreign: Record<SchemeId, string[]> = {
    VKI: ["konsumsi-qt:b1:g1", "konsumsi-label:statement", "konsumsi-financial:surat-pernyataan-modal-kerja", "nonindustri-support:rekening-koran", "partner:p1:lhvki", "konsumsi-brand:b1:evidence"],
    VIU_KONSUMSI: ["vki-support:listrik:m1", "vki-support:alur-proses", "partner:p1:lhvki", "nonindustri-support:rekening-koran", "nonindustri-partner:p1:contract", "support:legacy-1"],
    VIU_BAHAN_BAKU_NON_INDUSTRI: ["vki-support:tenaga-kerja", "partner:p1:lhvki", "konsumsi-qt:b1:g1", "konsumsi-financial:rekening-koran", "konsumsi-label:documentation"],
    VIU_BAHAN_BAKU_INDUSTRI: ["vki-support:listrik", "konsumsi-qt:b1:g1", "konsumsi-financial:rekening-koran", "nonindustri-partner:p1:contract", "konsumsi-brand:b1:rel:license_registration"],
  };
  for (const id of SCHEME_IDS) {
    it(`${id} does not recognise other schemes' keys`, () => {
      for (const key of foreign[id]) assert.equal(isDocumentApplicable([id], key), false, `${id} matched ${key}`);
    });
  }

  it("Pabrik is not a VIU location; it is a VKI one", () => {
    const ctx = { locationTypeById: { L1: "PABRIK" } };
    for (const id of VIU) assert.equal(isDocumentApplicable([id], "location:L1:ownership:SHM", ctx), false);
    assert.equal(isDocumentApplicable(["VKI"], "location:L1:ownership:SHM", ctx), true);
  });

  it("most specific pattern wins (tax-support:skf)", () => {
    assert.equal(findDocumentDef("VKI", "tax-support:skf")?.id, "tax-support-skf");
    assert.equal(findDocumentDef("VKI", "tax-support:ppn")?.id, "tax-support");
  });
});

describe("sifat per scheme (confirmed decisions)", () => {
  const sifat = (id: SchemeId, key: string) => findDocumentDef(id, key)?.sifat;
  it("bukti pajak / SKT: wajib alternatif in VKI, pendukung in every VIU", () => {
    assert.equal(sifat("VKI", "tax-proof-summary"), "WAJIB_ALTERNATIF");
    for (const id of VIU) {
      assert.equal(sifat(id, "tax-proof-summary"), "PENDUKUNG");
      assert.equal(sifat(id, "skt"), "PENDUKUNG");
    }
  });
  it("SP modal kerja wajib in every VIU — regulation for Konsumsi, internal LVI for bahan baku", () => {
    assert.equal(findDocumentDef("VIU_KONSUMSI", "konsumsi-financial:surat-pernyataan-modal-kerja")?.legalBasis.kind, "REGULASI");
    for (const id of ["VIU_BAHAN_BAKU_INDUSTRI", "VIU_BAHAN_BAKU_NON_INDUSTRI"] as SchemeId[]) {
      const def = findDocumentDef(id, "nonindustri-support:surat-pernyataan-modal-kerja");
      assert.equal(def?.sifat, "WAJIB");
      assert.equal(def?.legalBasis.kind, "INTERNAL_LVI");
    }
  });
  it("financial evidence: pilih salah satu for bahan baku, optional for Konsumsi", () => {
    assert.equal(sifat("VIU_BAHAN_BAKU_NON_INDUSTRI", "nonindustri-support:rekening-koran"), "PILIH_SALAH_SATU");
    assert.equal(sifat("VIU_BAHAN_BAKU_INDUSTRI", "nonindustri-support:fasilitas-kredit"), "PILIH_SALAH_SATU");
    assert.equal(sifat("VIU_KONSUMSI", "konsumsi-financial:rekening-koran"), "PENDUKUNG_JIKA_ADA");
  });
  it("VKI SP tidak diperjualbelikan / kebenaran data are pendukung (Pertimbangan Teknis basis)", () => {
    for (const key of ["vki-support:tidak-diperjualbelikan", "vki-support:kebenaran-data"]) {
      const def = findDocumentDef("VKI", key);
      assert.equal(def?.sifat, "PENDUKUNG");
      assert.equal(def?.legalBasis.kind, "TERKAIT");
    }
  });
  it("kontrak kerja sama is wajib for both bahan baku schemes", () => {
    assert.equal(sifat("VIU_BAHAN_BAKU_INDUSTRI", "partner:p1:contract"), "WAJIB");
    assert.equal(sifat("VIU_BAHAN_BAKU_NON_INDUSTRI", "nonindustri-partner:p1:contract"), "WAJIB");
  });
  it("multi-scheme: strongest sifat wins, each scheme keeps its own basis", () => {
    const req = resolveDocumentRequirement(["VIU_BAHAN_BAKU_INDUSTRI", "VIU_KONSUMSI"], "npwp");
    assert.equal(req.sifat, "WAJIB");
    assert.deepEqual(
      req.bySchemes.map((x) => x.def.legalBasis.citation),
      ["Pasal 37 ayat (2) huruf a angka 2 huruf a)", "Pasal 37 ayat (2) huruf c angka 2 huruf a)"],
    );
    const docs = resolveSchemeDocuments(["VIU_BAHAN_BAKU_INDUSTRI", "VIU_KONSUMSI"]);
    assert.equal(docs.filter((d) => d.id === "npwp").length, 1);
  });
});

describe("terms & forbidden vocabulary", () => {
  for (const id of SCHEME_IDS) {
    it(`${id}: its own terms, labels and legal notes contain no forbidden term`, () => {
      const s = getScheme(id);
      const texts = [
        s.terms.verificationName,
        s.terms.shortLabel,
        s.terms.importPurpose,
        s.terms.subject,
        ...s.documents.flatMap((d) => [d.label, d.legalBasis.note ?? ""]),
      ];
      for (const t of texts) assert.deepEqual(findForbiddenTerms(id, t), [], `${id}: "${t}"`);
    });
  }
  it("VIU text with VKI wording is caught", () => {
    assert.deepEqual(findForbiddenTerms("VIU_KONSUMSI", "objek Verifikasi Kemampuan Industri (VKI)"), [
      "Verifikasi Kemampuan Industri",
      "VKI",
    ]);
    assert.deepEqual(findForbiddenTerms("VIU_BAHAN_BAKU_INDUSTRI", "nomor LHVKI mitra"), []);
  });
});

describe("KBLI (VIU only)", () => {
  it("checks every VIU scheme, never VKI", () => {
    assert.deepEqual(validateViuKbli(["VKI"], ["13111"]), []);
    const r = validateViuKbli(["VIU_BAHAN_BAKU_NON_INDUSTRI", "VIU_KONSUMSI"], ["46412"]);
    assert.equal(r[0].ok, false); // 46412 not allowed for Non Industri
    assert.equal(r[1].ok, true);
    assert.equal(validateViuKbli(["VIU_BAHAN_BAKU_INDUSTRI"], ["45301"])[0].ok, true);
  });
});

describe("report content", () => {
  it("common chapters once, then scheme chapters; missing narrative blocks finalization", () => {
    const c = resolveReportContent(["VIU_BAHAN_BAKU_INDUSTRI", "VIU_KONSUMSI"]);
    const ids = c.sections.map((s) => s.section);
    assert.equal(ids.filter((x) => x === "legalitas").length, 1);
    assert.deepEqual(c.sections.find((s) => s.section === "legalitas")!.schemes, ["VIU_BAHAN_BAKU_INDUSTRI", "VIU_KONSUMSI"]);
    assert.ok(ids.indexOf("mitra-industri") < ids.indexOf("merek"));
    assert.equal(ids.filter((x) => x === "kemampuan-finansial").length, 2); // one per scheme
    assert.ok(!ids.includes("kemampuan-produksi"));
    const fin = canFinalizeReport(c);
    // Narratives are written in Tahap 2–5; until then the marker must block finalization.
    if (!fin.ok) assert.ok(fin.reasons.every((r) => r.startsWith("[BELUM DIATUR untuk VIU")));
  });
});

describe("snapshot", () => {
  it("document matrix per scheme matches the reviewed snapshot", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const file = join(here, "__snapshots__", "documents.json");
    const actual = Object.fromEntries(
      SCHEME_IDS.map((id) => [
        id,
        getScheme(id).documents.map((d) => ({
          id: d.id,
          sifat: d.sifat,
          basis: d.legalBasis.kind === "INTERNAL_LVI" ? "INTERNAL_LVI" : d.legalBasis.citation,
          ...(d.planned ? { planned: true } : {}),
        })),
      ]),
    );
    const json = `${JSON.stringify(actual, null, 2)}\n`;
    if (process.env.UPDATE_SNAPSHOTS || !existsSync(file)) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, json);
      return;
    }
    assert.equal(json, readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  });
});
