import { Building2, Download, Eye, MapPin, Warehouse } from "lucide-react";

import { fileHref, photoThumbHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES } from "../../legalitas";
import { answerLabel, buildLokasiStage, type LocationInput, type LokasiInput, type LokasiRow } from "../../lokasi";
import { Pill } from "../case-list/badges";
import { formatCalendarDate } from "../case-list/format";

const FLOW_DOT = { ok: "bg-[#16A34A]", warn: "bg-[#F59E0B]", none: "bg-[#CBD5E1]" } as const;
const FLOW_TEXT = { ok: "text-[#15803D]", warn: "text-[#B45309]", none: "text-[#64748B]" } as const;
const FIELD_TONE = { ok: "text-[#15803D]", bad: "text-[#B91C1C]", none: "text-[#64748B]" } as const;
const BUILDING = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" } as const;

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
      <div className="border-b border-[#EEF2F6] px-6 py-5">
        <h3 className="text-[17px] font-semibold">{title}</h3>
        {description && <p className="text-[13px] text-[#64748B]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function DocumentChip({ document }: { document: { label: string; path: string } }) {
  return (
    <div className="flex w-fit items-center gap-2 rounded-lg border border-[#E5EAF0] px-2.5 py-2">
      <span className="rounded bg-[#FEF2F2] px-1.5 py-1 text-[10px] font-bold text-[#B91C1C]">PDF</span>
      <span className="max-w-[160px] truncate text-[12.5px] text-[#1677FF]">{document.label}</span>
      <a href={fileHref(document.path)} target="_blank" rel="noopener noreferrer" aria-label={`Lihat ${document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
        <Eye className="size-4" aria-hidden />
      </a>
      <a href={fileHref(document.path)} download aria-label={`Unduh ${document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
        <Download className="size-4" aria-hidden />
      </a>
    </div>
  );
}

function LocationIcon({ type }: { type: string }) {
  const Icon = type === "Gudang" ? Warehouse : Building2;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#1677FF]">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function visitTone(location: LocationInput): "green" | "orange" | "slate" {
  if (!location.visit) return "slate";
  if (location.visit.conclusionStatus === "Sesuai") return "green";
  return location.visit.conclusionStatus ? "orange" : "slate";
}

function visitLabel(location: LocationInput): string {
  if (!location.visit) return "Belum dikunjungi";
  return location.visit.conclusionStatus ?? (location.visit.status === "COMPLETED" ? "Survey selesai" : "Survey berjalan");
}

function StatusCell({ row }: { row: LokasiRow }) {
  if (!row.document) return <span className="text-[12.5px] text-[#64748B]">—</span>;
  return <Pill tone={VERIFICATION_STATUS_TONES[row.document.status]}>{VERIFICATION_STATUS_LABELS[row.document.status]}</Pill>;
}

/** Tahap 3 "Lokasi" — design-reference/Lokasi.dc.html, read only. */
export function LokasiStage({ data }: { data: LokasiInput }) {
  const view = buildLokasiStage(data);
  const { locations } = data;

  return (
    <>
      <nav aria-label="Alur pemeriksaan lokasi" className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[#64748B]">Alur Pemeriksaan Lokasi</span>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {view.flow.map((step, index) => (
            <li key={step.label} className="flex flex-col gap-1 rounded-xl border border-[#E5EAF0] bg-white px-4 py-3 shadow-sm">
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="flex size-5 items-center justify-center rounded border border-[#E5EAF0] text-[11px] tabular-nums text-[#64748B]">{index + 1}</span>
                {step.label}
              </span>
              <span className={cn("flex items-center gap-1.5 text-[12.5px]", FLOW_TEXT[step.tone])}>
                <span className={cn("size-1.5 shrink-0 rounded-full", FLOW_DOT[step.tone])} aria-hidden />
                {step.value}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="ringkasan-lokasi" className="flex flex-col gap-3">
        <h3 id="ringkasan-lokasi" className="text-[17px] font-semibold">Ringkasan Lokasi</h3>
        {locations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-8 text-center text-[13px] text-[#64748B]">Permohonan ini belum mencantumkan lokasi.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {locations.map((location) => (
              <article key={location.id} className="flex flex-col gap-3 rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <LocationIcon type={location.type} />
                  <h4 className="flex-1 text-[15px] font-semibold">{location.type}</h4>
                  <Pill tone={visitTone(location)}>{visitLabel(location)}</Pill>
                </div>
                <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 text-[13px]">
                  <dt className="text-[#64748B]">Alamat</dt>
                  <dd className="font-medium">{location.address || "—"}</dd>
                  <dt className="text-[#64748B]">Status penguasaan</dt>
                  <dd className="font-medium">{location.buildingStatus ? BUILDING[location.buildingStatus] : "—"}</dd>
                  {location.buildingStatus === "SEWA" && (
                    <>
                      <dt className="text-[#64748B]">Masa sewa sampai</dt>
                      <dd className="font-medium">{formatCalendarDate(location.leaseEndDate)}</dd>
                    </>
                  )}
                  <dt className="text-[#64748B]">Dokumen</dt>
                  <dd className="flex flex-col gap-1.5">
                    {location.documents.length === 0 ? <span className="text-[#64748B]">—</span> : location.documents.map((document) => <DocumentChip key={document.key} document={document} />)}
                  </dd>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <Card title="Matriks Pemeriksaan Lokasi" description="Data pemohon dibandingkan dengan dokumen legal dan hasil kunjungan lapangan surveyor. Compliance hanya menampilkan.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-[13px]">
            <caption className="sr-only">Matriks pemeriksaan lokasi</caption>
            <thead>
              <tr>
                {["No", "Data / Parameter", "Isian", "Keterangan", "Dokumen Tersedia", "Hasil Lapangan", "Status Verifikasi", "Tipe Regulasi", "Note Regulasi"].map((label) => (
                  <th key={label} className="border-b border-[#EEF2F6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</th>
                ))}
              </tr>
            </thead>
            {view.groups.map((group) => (
              <tbody key={group.location.id}>
                <tr>
                  <td colSpan={9} className="border-b border-[#EEF2F6] bg-[#F8FAFC] px-4 py-2.5">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                      <MapPin className="size-4 text-[#1677FF]" aria-hidden />
                      {group.location.type}
                      <span className="font-normal text-[#64748B]">{group.location.address}</span>
                    </span>
                  </td>
                </tr>
                {group.rows.map((row, index) => (
                  <tr key={row.id} className="align-top">
                    <td className="border-b border-[#EEF2F6] px-4 py-3.5 tabular-nums text-[#64748B]">{index + 1}</td>
                    <th scope="row" className="border-b border-[#EEF2F6] px-4 py-3.5 text-left font-semibold">{row.parameter}</th>
                    <td className="max-w-[220px] border-b border-[#EEF2F6] px-4 py-3.5 font-medium">{row.value}</td>
                    <td className="max-w-[200px] border-b border-[#EEF2F6] px-4 py-3.5 text-[12.5px] text-[#475569]">{row.detail}</td>
                    <td className="border-b border-[#EEF2F6] px-4 py-3">{row.document ? <DocumentChip document={row.document} /> : <span className="text-[12.5px] text-[#64748B]">Tidak diunggah</span>}</td>
                    <td className={cn("border-b border-[#EEF2F6] px-4 py-3.5 font-medium", FIELD_TONE[row.fieldTone])}>{row.field}</td>
                    <td className="border-b border-[#EEF2F6] px-4 py-3.5"><StatusCell row={row} /></td>
                    <td className="border-b border-[#EEF2F6] px-4 py-3.5">
                      <span className={cn("rounded px-2 py-0.5 text-[11.5px] font-semibold", row.requirement === "Wajib" ? "bg-[#EAF2FF] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#475569]")}>{row.requirement}</span>
                    </td>
                    <td className="max-w-[220px] border-b border-[#EEF2F6] px-4 py-3.5 text-[12.5px] text-[#475569]">{row.regulation}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>

      <Card title="Hasil Verifikasi Lapangan" description="Diisi surveyor berdasarkan kunjungan ke kantor dan gudang pemohon.">
        <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
          {locations.map((location) => (
            <div key={location.id} className="flex flex-col gap-2 rounded-lg border border-[#E5EAF0] p-4">
              <h4 className="text-[14px] font-semibold">{location.type}</h4>
              {!location.visit ? (
                <p className="text-[13px] text-[#64748B]">Belum ada kunjungan surveyor untuk lokasi ini.</p>
              ) : (
                <dl className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  <dt className="text-[#64748B]">Tanggal kunjungan</dt><dd>{formatCalendarDate(location.visit.actualVisitDate)}</dd>
                  <dt className="text-[#64748B]">Surveyor</dt><dd>{location.visit.surveyorName ?? "—"}</dd>
                  <dt className="text-[#64748B]">Alamat ditemukan</dt><dd>{location.visit.addressFound ?? "—"}</dd>
                  <dt className="text-[#64748B]">Alamat sesuai</dt><dd>{answerLabel(location.visit.addressMatch, true)}</dd>
                  <dt className="text-[#64748B]">Penguasaan sesuai</dt><dd>{answerLabel(location.visit.ownershipMatch, true)}</dd>
                  <dt className="text-[#64748B]">Temuan</dt><dd className="whitespace-pre-line">{location.visit.findings ?? "—"}</dd>
                </dl>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Evidence Lapangan" description={`${view.photos.length} foto dokumentasi surveyor.`}>
        {view.photos.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-[#64748B]">Belum ada foto dokumentasi.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 px-6 py-5 md:grid-cols-3 xl:grid-cols-4">
            {view.photos.map((photo) => (
              <li key={photo.path} className="overflow-hidden rounded-lg border border-[#E5EAF0]">
                <a href={fileHref(photo.path)} target="_blank" rel="noopener noreferrer" className="block outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- stored file served by /api/files */}
                  <img src={photoThumbHref(photo.path)} alt={photo.caption ?? photo.label} className="aspect-[4/3] w-full bg-[#F1F5F9] object-cover" loading="lazy" />
                  <span className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1677FF]">{photo.location}</span>
                    <span className="text-[12.5px] font-medium">{photo.label}</span>
                    {photo.caption && <span className="text-[12px] text-[#64748B]">{photo.caption}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Data vs Kondisi Lapangan">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                {["Parameter", "Data Pemohon", "Hasil Lapangan", "Hasil"].map((label) => (
                  <th key={label} className="border-b border-[#EEF2F6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.flatMap((location) => [
                { key: `${location.id}-a`, parameter: `Alamat ${location.type}`, data: location.address, field: location.visit?.addressFound ?? "—", answer: location.visit?.addressMatch ?? null },
                {
                  key: `${location.id}-b`,
                  parameter: `Status penguasaan ${location.type}`,
                  data: location.buildingStatus ? BUILDING[location.buildingStatus] : "—",
                  field: location.visit ? "Diperiksa surveyor" : "—",
                  answer: location.visit?.ownershipMatch ?? null,
                },
              ]).map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="border-b border-[#EEF2F6] px-4 py-3 text-left font-medium">{row.parameter}</th>
                  <td className="border-b border-[#EEF2F6] px-4 py-3">{row.data || "—"}</td>
                  <td className="border-b border-[#EEF2F6] px-4 py-3">{row.field}</td>
                  <td className="border-b border-[#EEF2F6] px-4 py-3">
                    {row.answer ? <Pill tone={row.answer === "sesuai" ? "green" : "red"}>{answerLabel(row.answer, true)}</Pill> : <span className="text-[#64748B]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Kesimpulan Verifikasi Lokasi" description="Kesimpulan surveyor untuk setiap lokasi.">
        <ul className="grid gap-3 px-6 py-5 lg:grid-cols-2">
          {locations.map((location) => (
            <li key={location.id} className="flex flex-col gap-1.5 rounded-lg border border-[#E5EAF0] p-4">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[14px] font-semibold">{location.type}</span>
                <Pill tone={visitTone(location)}>{location.visit?.conclusionStatus ?? "Belum disimpulkan"}</Pill>
              </div>
              {location.visit?.recommendation && <p className="text-[12.5px] text-[#475569]">Rekomendasi: {location.visit.recommendation}</p>}
              {location.visit?.summary && <p className="whitespace-pre-line text-[13px]">{location.visit.summary}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
