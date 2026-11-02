"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { formatAssignmentDate, formatRecordedAt } from "@/lib/assignment-date";
import type { PmApplicationDetail } from "../detail/types";
import {
  DEFAULT_LEMBAGA,
  LAMPIRAN_CATALOG,
  defaultLampiranOtomatis,
  DEFAULT_TEMPAT,
  SCHEME_NAME,
  missingFields,
  nomorPlaceholder,
  schemeOf,
  tanggalParts,
  type BeritaAcara,
  type BeritaAcaraInput,
} from "../../berita-acara";

type Form = Omit<BeritaAcaraInput, "lampiranTambahan"> & { lampiranTambahan: string };

/** The location the verification took place at: the factory for VKI, else the office; the first one otherwise. */
function mainLocation(data: PmApplicationDetail) {
  const locations = data.locationSummaries ?? [];
  const order = data.verificationType === "VKI" ? ["PABRIK", "KANTOR", "GUDANG"] : ["KANTOR", "GUDANG", "PABRIK"];
  for (const type of order) {
    const found = locations.find((l) => l.locationType === type);
    if (found) return found;
  }
  return locations[0] ?? null;
}

/** "KABUPATEN BANDUNG, JAWA BARAT" → "Bandung"; "Kab. Boyolali, Jawa Tengah" → "Boyolali". */
function cityName(cityProvince: string): string {
  const city = cityProvince.split(",")[0]?.trim() ?? "";
  const bare = city.replace(/^(kabupaten|kab\.?|kota|kota adm\.?|kota administrasi)\s+/i, "");
  return bare.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function defaultsFrom(data: PmApplicationDetail): Form {
  const loc = mainLocation(data);
  const scheme = schemeOf(data.verificationType);
  return {
    nomor: "",
    tanggal: "",
    tempat: DEFAULT_TEMPAT,
    kota: loc ? cityName(loc.cityProvince) : "",
    namaPerusahaan: data.company.companyName ?? "",
    alamat: loc ? [loc.address, loc.cityProvince].filter(Boolean).join(", ") : data.businessAddress ?? "",
    lembagaNama: DEFAULT_LEMBAGA,
    penandatanganNama: "",
    penandatanganJabatan: "",
    picNama: data.payload?.contactFullName ?? "",
    picJabatan: data.payload?.contactDesignation ?? "",
    lampiranOtomatis: defaultLampiranOtomatis(scheme),
    lampiranTambahan: "",
  };
}

const toForm = (ba: BeritaAcara): Form => ({ ...ba, lampiranTambahan: ba.lampiranTambahan.join("\n") });
const toInput = (form: Form): BeritaAcaraInput => ({
  ...form,
  lampiranTambahan: form.lampiranTambahan
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
});

const INPUT = "w-full rounded-lg border border-[#e8d5c5] bg-white px-3 py-2 text-[13px] text-[#20180f] outline-none focus:border-[#e0662e]";

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-[11.5px] font-bold text-[#6b5b4c]">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-[#a68f80]">{hint}</span>}
    </label>
  );
}

/**
 * Berita Acara Pelaksanaan tab — the Project Manager fills in the nomor, tanggal, tempat, penandatangan
 * and lampiran (company name, address and PIC are prefilled from the application), saves it, then opens
 * the printable document (Cetak / Unduh PDF).
 */
export function BeritaAcaraTab({ data, applicationNumber, jenis }: { data: PmApplicationDetail; applicationNumber: string; jenis: string }) {
  const queryClient = useQueryClient();
  const key = ["project-manager-workspace", "berita-acara", applicationNumber];
  const { data: saved, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/berita-acara`);
      if (!response.ok) throw new Error("Gagal memuat Berita Acara");
      return ((await response.json()) as { data: { beritaAcara: BeritaAcara | null } }).data.beritaAcara;
    },
  });

  if (isLoading) return <div className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</div>;
  return (
    <BeritaAcaraForm
      key={saved?.updatedAt ?? "baru"}
      data={data}
      jenis={jenis}
      applicationNumber={applicationNumber}
      saved={saved ?? null}
      onSaved={(ba) => queryClient.setQueryData(key, ba)}
    />
  );
}

function BeritaAcaraForm({
  data,
  jenis,
  applicationNumber,
  saved,
  onSaved,
}: {
  data: PmApplicationDetail;
  jenis: string;
  applicationNumber: string;
  saved: BeritaAcara | null;
  onSaved: (ba: BeritaAcara) => void;
}) {
  const scheme = schemeOf(data.verificationType);
  const [form, setForm] = useState<Form>(() => (saved ? toForm(saved) : defaultsFrom(data)));
  const [saving, setSaving] = useState(false);

  const surveyDates = useMemo(
    () => [...new Set((data.assignments.survey?.locationVisits ?? []).map((v) => v.surveyDate).filter((d): d is string => Boolean(d)))].sort(),
    [data],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const parts = tanggalParts(form.tanggal);
  const missing = missingFields(toInput(form));
  const dirty = JSON.stringify(toInput(form)) !== JSON.stringify(saved ? toInput(toForm(saved)) : null);
  const reportHref = `/project-manager-workspace/applications/${jenis}/${applicationNumber}/berita-acara-report`;

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}/berita-acara`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toInput(form)),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Gagal menyimpan Berita Acara");
      onSaved(body.data.beritaAcara);
      toast.success("Berita Acara Pelaksanaan disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan Berita Acara");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[14px] font-extrabold text-[#20180f]">Berita Acara Pelaksanaan {SCHEME_NAME[scheme]} ({scheme})</div>
        <div className="mb-4 text-[12px] text-[#8a7565]">
          Lengkapi data di bawah, simpan, lalu buka dokumen untuk dicetak atau diunduh sebagai PDF. Nama perusahaan, alamat dan PIC terisi dari
          permohonan dan dapat diubah.
          {saved && (
            <span className="ml-1">
              Terakhir disimpan {formatRecordedAt(saved.updatedAt)}
              {saved.updatedByName ? ` oleh ${saved.updatedByName}` : ""}.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nomor Berita Acara" hint={`Contoh: ${nomorPlaceholder(scheme, form.tanggal)}`}>
            <input className={INPUT} value={form.nomor} placeholder={nomorPlaceholder(scheme, form.tanggal)} onChange={(e) => set("nomor", e.target.value)} />
          </Field>
          <Field
            label="Tanggal Pelaksanaan"
            hint={parts ? `Tercetak: hari ${parts.hari} tanggal ${parts.tanggal} bulan ${parts.bulan} tahun ${parts.tahun}` : undefined}
          >
            <input type="date" className={INPUT} value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
            {surveyDates.length > 0 && (
              <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8a7565]">
                Tanggal kunjungan survei:
                {surveyDates.map((d) => (
                  <button key={d} type="button" className="rounded-full bg-[#fdeadd] px-2 py-0.5 font-bold text-[#c14a1f]" onClick={() => set("tanggal", d)}>
                    {formatAssignmentDate(d)}
                  </button>
                ))}
              </span>
            )}
          </Field>
          <Field label="Tempat Pelaksanaan" hint={`Tercetak: "bertempat di ${form.tempat || "…"}"`}>
            <input className={INPUT} value={form.tempat} onChange={(e) => set("tempat", e.target.value)} />
          </Field>
          <Field label="Kota Penandatanganan" hint={`Tercetak di atas tanda tangan, mis. "Bandung, 15 April 2026"`}>
            <input className={INPUT} value={form.kota} onChange={(e) => set("kota", e.target.value)} />
          </Field>
          <Field label="Nama Perusahaan">
            <input className={INPUT} value={form.namaPerusahaan} onChange={(e) => set("namaPerusahaan", e.target.value)} />
          </Field>
          <Field label="Lembaga Pelaksana">
            <input className={INPUT} value={form.lembagaNama} onChange={(e) => set("lembagaNama", e.target.value)} />
          </Field>
          <Field label="Alamat" wide>
            <textarea className={`${INPUT} min-h-16`} value={form.alamat} onChange={(e) => set("alamat", e.target.value)} />
          </Field>
          <Field label="Penandatangan Lembaga — Nama">
            <input className={INPUT} value={form.penandatanganNama} onChange={(e) => set("penandatanganNama", e.target.value)} />
          </Field>
          <Field label="Penandatangan Lembaga — Jabatan">
            <input className={INPUT} value={form.penandatanganJabatan} onChange={(e) => set("penandatanganJabatan", e.target.value)} />
          </Field>
          <Field label="PIC Pemohon — Nama">
            <input className={INPUT} value={form.picNama} onChange={(e) => set("picNama", e.target.value)} />
          </Field>
          <Field label="PIC Pemohon — Jabatan">
            <input className={INPUT} value={form.picJabatan} onChange={(e) => set("picJabatan", e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-[11.5px] font-bold text-[#6b5b4c]">Lampiran dari Sistem</span>
            <span className="text-[11px] text-[#a68f80]">
              Form kosong dicetak untuk diisi dan ditandatangani di lokasi; lampiran data dicetak dari detail permohonan. Dinomori otomatis (I, II, III, …).
            </span>
            <div className="mt-1 grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {LAMPIRAN_CATALOG[scheme].map((l) => (
                <label key={l.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#f0ded0] px-3 py-2 text-[12.5px] text-[#20180f]">
                  <input
                    type="checkbox"
                    checked={form.lampiranOtomatis.includes(l.key)}
                    onChange={(e) =>
                      set(
                        "lampiranOtomatis",
                        e.target.checked ? [...form.lampiranOtomatis, l.key] : form.lampiranOtomatis.filter((k) => k !== l.key),
                      )
                    }
                  />
                  <span className="flex-1">{l.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${l.kind === "data" ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#f2ece5] text-[#6b5b4c]"}`}
                  >
                    {l.kind === "data" ? "Data permohonan" : "Form kosong"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Field label="Lampiran Tambahan" hint="Opsional — dokumen lain yang dilampirkan, satu per baris; hanya dicantumkan dalam daftar lampiran." wide>
            <textarea
              className={`${INPUT} min-h-20 text-[12.5px]`}
              value={form.lampiranTambahan}
              placeholder="Mis. Dokumentasi foto kegiatan"
              onChange={(e) => set("lampiranTambahan", e.target.value)}
            />
          </Field>
        </div>

        {missing.length > 0 && (
          <div className="mt-4 rounded-lg bg-[#fff6e5] px-3.5 py-2.5 text-[12px] text-[#8a5a10]">Belum diisi: {missing.join(", ")}.</div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white ${saving || !dirty ? "bg-[#c9b8aa]" : "bg-[#20180f] hover:bg-black"}`}
          >
            <MaterialIcon name="save" className="text-[17px]" />
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <a
            href={saved && !dirty ? reportHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!saved || dirty}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white ${
              !saved || dirty ? "pointer-events-none bg-[#c9b8aa]" : "bg-[#e0662e] hover:bg-[#c1361f]"
            }`}
          >
            <MaterialIcon name="picture_as_pdf" className="text-[17px]" />
            Lihat &amp; Cetak Berita Acara
          </a>
          {dirty && saved && <span className="text-[11.5px] text-[#a68f80]">Simpan perubahan sebelum mencetak.</span>}
          {!saved && <span className="text-[11.5px] text-[#a68f80]">Simpan terlebih dahulu untuk membuka dokumen.</span>}
        </div>
      </div>
    </div>
  );
}
