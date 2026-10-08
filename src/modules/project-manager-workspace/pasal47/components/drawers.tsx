"use client";

import type { ReactNode } from "react";

import { brandCertificateStatus, lhviuStatus } from "../derive";
import { fd, moneyFull, nf, sum, sym, uniq } from "../format";
import type { P47Application, P47Brand, P47Dataset, P47Place } from "../types";
import { fileHref, type DrawerSpec } from "./context";
import { Badge, Na } from "./ui";

const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h4>{title}</h4>
    {children}
  </section>
);

export const KV = ({ pairs }: { pairs: [string, ReactNode][] }) => (
  <dl className="kv">
    {pairs.map(([k, v]) => (
      <div key={k} style={{ display: "contents" }}>
        <dt>{k}</dt>
        <dd>{v === "" || v === null || v === undefined ? "—" : v}</dd>
      </div>
    ))}
  </dl>
);

export const Mini = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="tscroll">
    <table className="mini">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export const ownBadge = (v: string) => (v ? <Badge tone={v === "Sewa" ? "na" : "ok"}>{v}</Badge> : <Na>belum diisi</Na>);
const FileLink = ({ path, label }: { path: string; label: string }) => (
  <a className="btn sm" href={fileHref(path)} target="_blank" rel="noopener noreferrer">{label}</a>
);

export function companyDrawer(app: P47Application, ds: P47Dataset): DrawerSpec {
  const lines = ds.lines.filter((l) => l.applicationId === app.id);
  const findings = ds.findings.filter((f) => f.applicationId === app.id);
  const st = lhviuStatus(app);
  return {
    title: app.company,
    sub: `NIB ${app.nib || "—"} · ${app.applicationNumber}`,
    body: (
      <>
        <Sec title="Profil perusahaan">
          <KV pairs={[
            ["Jenis API", "API-U (Angka Pengenal Impor Umum)"],
            ["KBLI Utama", app.kbli.map((k) => `${k.code} ${k.description}`).join("; ")],
            ["Nomor permohonan", <span key="n" className="mono">{app.applicationNumber}</span>],
            ["Tanggal pengajuan", fd(app.submittedAt)],
            ["Kantor", app.kantor ? `${app.kantor.address}, ${app.kantor.city}` : ""],
            ["Kepemilikan kantor", ownBadge(app.kantor?.ownership ?? "")],
            ...app.gudang.map((g, i): [string, ReactNode] => [`Gudang ${app.gudang.length > 1 ? i + 1 : ""}`.trim(), <span key={i}>{g.address}, {g.city} {ownBadge(g.ownership)}</span>]),
          ]} />
        </Sec>
        <Sec title="LHVIU">
          <KV pairs={[["Status", <Badge key="s" tone={st.tone}>{st.label}</Badge>], ["Diunggah", app.lhviu ? fd(app.lhviu.uploadedAt) : ""], ["Nomor & masa berlaku", <Na key="m">tidak tercatat di sistem</Na>]]} />
          {app.lhviu && <div style={{ marginTop: 8 }}><FileLink path={app.lhviu.path} label={`Lihat ${app.lhviu.fileName}`} /></div>}
        </Sec>
        <Sec title={`Product line (${lines.length})`}>
          {lines.length ? <Mini head={["HS", "Produk", "Merek", "Kuantitas"]} rows={lines.map((l) => [<span key="h" className="mono">{l.hs}</span>, l.productName, l.brandName, `${nf(l.quantity)} ${l.unit}`])} /> : <Na>Tidak ada product line.</Na>}
        </Sec>
        <Sec title={`Temuan (${findings.length})`}>
          {findings.length ? <Mini head={["Temuan", "Severity", "Status"]} rows={findings.map((f) => [f.text, <Badge key="s" tone="sev">{f.severity}</Badge>, <Badge key="t" tone={f.status.tone}>{f.status.label}</Badge>])} /> : <Na>Tidak ada temuan.</Na>}
        </Sec>
        <a className="btn sm" href={`/project-manager-workspace/viu/konsumsi/applications/${app.applicationNumber}`}>Buka detail permohonan →</a>
      </>
    ),
  };
}

export function brandDrawer(brand: P47Brand, ds: P47Dataset): DrawerSpec {
  const lines = ds.lines.filter((l) => l.brandId === brand.id);
  const cert = brandCertificateStatus(brand, ds.period.to);
  return {
    title: brand.name,
    sub: `${brand.uses.length} permohonan memakai merek ini`,
    body: (
      <>
        <Sec title="Kepemilikan merek">
          <KV pairs={[["Pemilik merek", brand.owner], ["Negara pemilik", brand.ownerCountry], ["Perwakilan resmi", brand.representative || <Na key="r">tidak ada</Na>]]} />
        </Sec>
        <Sec title="Bukti merek">
          <KV pairs={[["Jenis merek", brand.evidenceType], ["No. sertifikat", brand.registrationNumber ? <span key="n" className="mono">{brand.registrationNumber}</span> : ""], ["Tanggal terbit", fd(brand.registrationDate)], ["Tanggal kedaluwarsa", fd(brand.expiryDate)], ["Kelas", brand.classes.join(", ")], ["Status", <Badge key="s" tone={cert.tone}>{cert.label}</Badge>]]} />
          {brand.evidencePath && <div style={{ marginTop: 8 }}><FileLink path={brand.evidencePath} label="Lihat bukti merek" /></div>}
        </Sec>
        <Sec title="Importir & dasar penunjukan">
          <Mini head={["API-U", "Peran", "Dokumen"]} rows={brand.uses.map((u) => [u.company, u.basis, <span key="d"><Badge tone={u.docStatus.tone}>{u.docStatus.label}</Badge>{u.missingDocuments.length ? <span className="sub" style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>Belum ada: {u.missingDocuments.join(", ")}</span> : null}</span>])} />
        </Sec>
        <Sec title={`Produk / HS (${lines.length})`}>
          <Mini head={["HS", "Produk", "Negara asal", "Kuantitas"]} rows={lines.map((l) => [<span key="h" className="mono">{l.hs}</span>, l.productName, l.countries.join(", "), `${nf(l.quantity)} ${l.unit}`])} />
        </Sec>
      </>
    ),
  };
}

export function hsDrawer(hs: string, ds: P47Dataset): DrawerSpec {
  const lines = ds.lines.filter((l) => l.hs === hs);
  const apps = uniq(lines.map((l) => l.applicationId));
  return {
    title: hs,
    sub: lines[0]?.hsDescription ?? "",
    body: (
      <>
        <Sec title="Klasifikasi">
          <KV pairs={[["Kelompok", lines[0]?.kelompok ?? ""], ["Sub Kelompok", lines[0]?.subKelompok ?? ""], ["Komoditas", lines[0]?.komoditas ?? ""], ["Product line", String(lines.length)]]} />
        </Sec>
        <Sec title="Rencana kebutuhan per satuan">
          <Mini head={["Satuan", "Kuantitas"]} rows={uniq(lines.map((l) => l.unit || "—")).map((u) => [u, nf(sum(lines.filter((l) => (l.unit || "—") === u).map((l) => l.quantity)))])} />
        </Sec>
        <Sec title="Nilai rencana impor per currency">
          <Mini head={["Currency", "Nilai", "Harga satuan rata-rata"]} rows={uniq(lines.map((l) => l.currency)).map((c) => {
            const x = lines.filter((l) => l.currency === c), v = sum(x.map((l) => l.total)), q = sum(x.map((l) => l.quantity));
            const oneUnit = uniq(x.map((l) => l.unit)).length === 1;
            return [<span key="c" className="mono">{c}</span>, moneyFull(c, v), oneUnit && q ? `${sym(c)} ${(v / q).toLocaleString("id-ID", { maximumFractionDigits: 2 })} / ${x[0].unit}` : <Na key="n">satuan berbeda</Na>];
          })} />
        </Sec>
        <Sec title="Drill-down">
          <ul className="tree">
            <li><span className="lv">HS</span><b className="mono">{hs}</b>
              <ul>
                {apps.map((id) => {
                  const ls = lines.filter((l) => l.applicationId === id);
                  return (
                    <li key={id}><span className="lv">Company</span><b>{ls[0].company}</b>
                      <ul><li><span className="lv">Application</span><span className="mono">{ls[0].applicationNumber}</span>
                        <ul>{ls.map((l) => (
                          <li key={l.id}><span className="lv">Product line</span>{l.productName} · {nf(l.quantity)} {l.unit}
                            <ul><li><span className="lv">Brand</span>{l.brandName}
                              <ul><li><span className="lv">Origin</span><b>{l.countries.join(", ")}</b> {l.countries.length > 1 && <Badge tone="warn">tanpa alokasi</Badge>}</li></ul>
                            </li></ul>
                          </li>
                        ))}</ul>
                      </li></ul>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </Sec>
      </>
    ),
  };
}

export function countryDrawer(country: string, ds: P47Dataset): DrawerSpec {
  const lines = ds.lines.filter((l) => l.countries.includes(country));
  return {
    title: country,
    sub: `${lines.length} relasi product line`,
    body: (
      <>
        <Sec title="Relasi produk">
          <Mini head={["HS", "Merek", "API-U", "Alokasi"]} rows={lines.map((l) => [<span key="h" className="mono">{l.hs}</span>, l.brandName, l.company, <span key="a">{l.countries.length > 1 ? <Badge tone="warn">tidak ada</Badge> : <Badge tone="ok">tunggal</Badge>}{l.countryAutoFilled && <> <Badge tone="warn">diisi sistem</Badge></>}</span>])} />
        </Sec>
        <p style={{ margin: 0, color: "var(--ink-2)" }}>Volume tidak ditampilkan per negara karena {lines.filter((l) => l.countries.length > 1).length} product line memiliki lebih dari satu negara asal tanpa alokasi kuantitas.</p>
      </>
    ),
  };
}

export type LokasiTipe = "kantor" | "gudang";
export type LokasiLevel = "kota" | "provinsi";
export const placesOf = (a: P47Application, tipe: LokasiTipe): P47Place[] => (tipe === "kantor" ? (a.kantor ? [a.kantor] : []) : a.gudang);
export const placeKey = (p: P47Place, level: LokasiLevel) => (level === "kota" ? p.city : p.province) || "Tidak diisi";

export function lokasiDrawer(tipe: LokasiTipe, level: LokasiLevel, name: string, ds: P47Dataset): DrawerSpec {
  const rows = ds.applications.flatMap((a) => placesOf(a, tipe).filter((p) => placeKey(p, level) === name).map((p) => ({ a, p })));
  return {
    title: name,
    sub: `${uniq(rows.map((r) => r.a.company)).length} perusahaan · lokasi ${tipe} · ${level === "kota" ? "kota/kabupaten" : "provinsi"}`,
    body: (
      <Sec title="Perusahaan API-U">
        <Mini head={["Perusahaan", `Alamat ${tipe}`, "Kepemilikan", "LHVIU"]} rows={rows.map(({ a, p }) => { const st = lhviuStatus(a); return [<b key="c">{a.company}</b>, p.address, ownBadge(p.ownership), <Badge key="l" tone={st.tone}>{st.label}</Badge>]; })} />
      </Sec>
    ),
  };
}

export function kvDrawer(title: string, sub: string, pairs: [string, ReactNode][]): DrawerSpec {
  return { title, sub, body: <Sec title="Rincian"><KV pairs={pairs} /></Sec> };
}
