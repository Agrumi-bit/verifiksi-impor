import { VIU_KONSUMSI_KBLI } from "../../schemes/viu-konsumsi/terms";

import { lhviuStatus } from "./derive";
import { fdLong, joinId, uniq, withWords } from "./format";
import type { P47Application, P47Dataset, P47Place } from "./types";

/**
 * Bab "Data Perusahaan API-U" — the profile of the Perusahaan API-U in the period: how many, which KBLI
 * Utama they hold, where their kantor and gudang are, who owns those buildings and where each LHVIU stands.
 * Every figure is counted from the dataset; a fact the system does not hold (LHVIU number, validity) is
 * said to be absent rather than guessed.
 */

export type KbliRow = { code: string; description: string; companies: string[]; allowed: boolean };
export type LocationRow = { province: string; city: string; kantor: number; gudang: number; companies: string[] };

const UNKNOWN = "Tidak diisi";
const allowedKbli = new Set<string>(VIU_KONSUMSI_KBLI);

/** KBLI Utama held by the companies, most-held first. */
export function kbliRows(apps: P47Application[]): KbliRow[] {
  const map = new Map<string, KbliRow>();
  for (const app of apps) {
    for (const entry of app.kbli) {
      if (!entry.code) continue;
      const row = map.get(entry.code) ?? { code: entry.code, description: entry.description, companies: [], allowed: allowedKbli.has(entry.code) };
      if (!row.companies.includes(app.company)) row.companies.push(app.company);
      map.set(entry.code, row);
    }
  }
  return [...map.values()].sort((a, b) => b.companies.length - a.companies.length || a.code.localeCompare(b.code));
}

/** Kantor and gudang counted per kota, province-first. */
export function locationRows(apps: P47Application[]): LocationRow[] {
  const map = new Map<string, LocationRow>();
  const add = (place: P47Place, kind: "kantor" | "gudang", company: string) => {
    const province = place.province || UNKNOWN;
    const city = place.city || UNKNOWN;
    const key = `${province}|${city}`;
    const row = map.get(key) ?? { province, city, kantor: 0, gudang: 0, companies: [] };
    row[kind] += 1;
    if (!row.companies.includes(company)) row.companies.push(company);
    map.set(key, row);
  };
  for (const app of apps) {
    if (app.kantor) add(app.kantor, "kantor", app.company);
    for (const g of app.gudang) add(g, "gudang", app.company);
  }
  return [...map.values()].sort((a, b) => a.province.localeCompare(b.province, "id") || a.city.localeCompare(b.city, "id"));
}

function ownershipSplit(places: P47Place[]) {
  return {
    own: places.filter((p) => p.ownership === "Milik Sendiri").length,
    rent: places.filter((p) => p.ownership === "Sewa").length,
    unknown: places.filter((p) => !p.ownership).length,
  };
}

function ownershipSentence(label: string, split: ReturnType<typeof ownershipSplit>, total: number): string {
  if (total === 0) return `Belum ada ${label} yang tercatat.`;
  const parts = [`${split.own} berstatus milik sendiri`, `${split.rent} berstatus sewa`];
  if (split.unknown) parts.push(`${split.unknown} belum diisi status kepemilikannya`);
  return `Dari ${total} ${label}, ${parts.join(", ")}.`;
}

const ranked = (items: string[], limit: number) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id")).slice(0, limit);
};

/** The chapter's narrative, one string per paragraph. */
export function companyChapterNarrative(ds: P47Dataset): string[] {
  const apps = ds.applications;
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  if (apps.length === 0) {
    return [`Pada periode ${period} belum terdapat Perusahaan API-U yang mengajukan VIU Produk Tekstil sebagai Barang Konsumsi, sehingga bab ini tidak memuat data perusahaan.`];
  }

  const companies = uniq(apps.map((a) => a.companyId ?? a.company));
  const dates = apps.map((a) => a.submittedAt).filter(Boolean).sort();
  const paragraphs: string[] = [];

  paragraphs.push(
    `Bab ini menyajikan profil Perusahaan API-U yang mengajukan VIU Produk Tekstil sebagai Barang Konsumsi pada periode ${period}. Pada periode tersebut tercatat ${withWords(companies.length)} Perusahaan API-U dengan ${withWords(apps.length)} permohonan; satu permohonan hanya mewakili satu jenis impor. Permohonan diajukan sejak ${fdLong(dates[0])}${dates.length > 1 && dates[dates.length - 1] !== dates[0] ? ` hingga ${fdLong(dates[dates.length - 1])}` : ""}. Data bersumber dari profil perusahaan dan data permohonan yang disampaikan melalui sistem.`,
  );

  const kbli = kbliRows(apps);
  const matching = apps.filter((a) => a.kbli.some((k) => allowedKbli.has(k.code))).length;
  if (kbli.length === 0) {
    paragraphs.push("Belum ada KBLI Utama yang tercatat pada profil perusahaan yang diverifikasi.");
  } else {
    const top = kbli.slice(0, 4).map((r) => `${r.code} (${r.description.toLowerCase()}) pada ${r.companies.length} perusahaan`);
    paragraphs.push(
      `Dari sisi kegiatan usaha, KBLI Utama yang tercatat adalah ${joinId(top)}. Sesuai Pasal 37 ayat (2) huruf c angka 2 huruf b Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, Perusahaan API-U yang mengimpor Produk Tekstil sebagai barang konsumsi harus memiliki KBLI Utama di bidang perdagangan besar; ${matching} dari ${apps.length} perusahaan memiliki KBLI Utama yang termasuk dalam daftar tersebut${matching === apps.length ? "." : `, sedangkan ${apps.length - matching} perusahaan lainnya perlu dikonfirmasi kesesuaiannya.`}`,
    );
  }

  const kantor = apps.flatMap((a) => (a.kantor ? [a.kantor] : []));
  const gudang = apps.flatMap((a) => a.gudang);
  const kantorProvinces = ranked(kantor.map((p) => p.province || UNKNOWN), 5);
  const kantorCities = uniq(kantor.map((p) => p.city).filter(Boolean));
  paragraphs.push(
    kantor.length
      ? `Kantor Perusahaan API-U tersebar di ${withWords(kantorProvinces.length)} provinsi, yaitu ${joinId(kantorProvinces.map(([p, n]) => `${p} (${n})`))}${kantorCities.length ? `, meliputi ${joinId(kantorCities.slice(0, 6))}` : ""}. ${ownershipSentence("kantor", ownershipSplit(kantor), kantor.length)}`
      : "Belum ada lokasi kantor yang tercatat pada permohonan.",
  );

  const withGudang = apps.filter((a) => a.gudang.length > 0).length;
  const gudangCities = ranked(gudang.map((p) => p.city || UNKNOWN), 5);
  paragraphs.push(
    gudang.length
      ? `Perusahaan API-U melaporkan ${withWords(gudang.length)} gudang yang digunakan untuk menyimpan Produk Tekstil, berada di ${joinId(gudangCities.map(([c, n]) => `${c} (${n})`))}; ${withGudang} dari ${apps.length} perusahaan memiliki sedikitnya satu gudang. ${ownershipSentence("gudang", ownershipSplit(gudang), gudang.length)} Kapasitas dan stok setiap gudang dibahas pada Bab Persediaan dan Gudang.`
      : "Belum ada lokasi gudang yang tercatat pada permohonan.",
  );

  const stat = (label: string) => apps.filter((a) => lhviuStatus(a).label === label).length;
  const terbit = stat("Terbit");
  const proses = stat("Dalam Proses");
  const belumUnggah = stat("Belum Diunggah");
  const lhviuParts = [`${terbit} telah terbit`, proses ? `${proses} masih dalam proses verifikasi` : "", belumUnggah ? `${belumUnggah} telah selesai diverifikasi namun file LHVIU belum diunggah` : ""].filter(Boolean);
  paragraphs.push(
    `Status Laporan Hasil Verifikasi Importir Umum (LHVIU) atas ${apps.length} permohonan: ${joinId(lhviuParts)}. Status ini ditentukan dari file LHVIU yang diunggah Project Manager; nomor dan masa berlaku LHVIU belum tercatat pada sistem, sehingga tidak dicantumkan dalam bab ini.`,
  );

  const noLocation = apps.filter((a) => !a.kantor || a.gudang.length === 0);
  if (noLocation.length) {
    paragraphs.push(`Catatan data: lokasi kantor atau gudang belum lengkap pada ${noLocation.length} permohonan (${joinId(noLocation.map((a) => a.company))}) dan perlu dilengkapi sebelum laporan disampaikan.`);
  }
  return paragraphs;
}
