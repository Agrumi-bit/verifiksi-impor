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
  OPENING_AGENDA,
  emptyBeritaAcaraForms,
  defaultLampiranOtomatis,
  DEFAULT_TEMPAT,
  SCHEME_NAME,
  missingFields,
  nomorPlaceholder,
  schemeOf,
  tanggalParts,
  type BeritaAcara,
  type BeritaAcaraForms,
  type BeritaAcaraInput,
} from "../../berita-acara";

type SubTab = "data" | "opening" | "hadir" | "bak";
const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "data", label: "Data Berita Acara" },
  { key: "opening", label: "Opening Meeting" },
  { key: "hadir", label: "Daftar Hadir" },
  { key: "bak", label: "Berita Acara Klarifikasi" },
];

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
    forms: emptyBeritaAcaraForms(),
  };
}

const toForm = (ba: BeritaAcara): Form => ({ ...ba, forms: ba.forms ?? emptyBeritaAcaraForms(), lampiranTambahan: ba.lampiranTambahan.join("\n") });
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
  const [sub, setSub] = useState<SubTab>("data");

  const surveyDates = useMemo(
    () => [...new Set((data.assignments.survey?.locationVisits ?? []).map((v) => v.surveyDate).filter((d): d is string => Boolean(d)))].sort(),
    [data],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const setForms = <K extends keyof BeritaAcaraForms>(k: K, patch: Partial<BeritaAcaraForms[K]>) =>
    setForm((prev) => ({ ...prev, forms: { ...prev.forms, [k]: { ...prev.forms[k], ...patch } } }));
  const lampiranOff = (key: string) => !form.lampiranOtomatis.includes(key);
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

        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#f0ded0]">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSub(t.key)}
              className={`-mb-px rounded-t-lg border-b-2 px-3.5 py-2 text-[12.5px] font-bold ${
                sub === t.key ? "border-[#e0662e] text-[#c14a1f]" : "border-transparent text-[#8a7565] hover:text-[#20180f]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {sub !== "data" && lampiranOff(sub) && (
          <div className="mb-3 rounded-lg bg-[#fff6e5] px-3.5 py-2.5 text-[12px] text-[#8a5a10]">
            Lampiran ini belum dicentang di &quot;Lampiran dari Sistem&quot; (tab Data Berita Acara), jadi isiannya tidak ikut tercetak.
          </div>
        )}
        {sub === "opening" && <OpeningForm scheme={scheme} value={form.forms.opening} onChange={(p) => setForms("opening", p)} />}
        {sub === "hadir" && <HadirForm value={form.forms.hadir} onChange={(p) => setForms("hadir", p)} picNama={form.picNama} picJabatan={form.picJabatan} namaPerusahaan={form.namaPerusahaan} lembaga={form.lembagaNama} />}
        {sub === "bak" && <BakForm value={form.forms.bak} onChange={(p) => setForms("bak", p)} />}

        {sub === "data" && (
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
        )}

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

const ADD_BTN = "flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]";
const DEL_BTN = "rounded-md border border-[#f1c4bd] bg-white p-1 text-[#dc2626] hover:bg-[#fdf1ef]";

function WaktuFields({ value, onChange }: { value: { waktuMulai: string; waktuSelesai: string }; onChange: (p: { waktuMulai?: string; waktuSelesai?: string }) => void }) {
  return (
    <>
      <Field label="Waktu Mulai" hint="Tercetak: “… s.d. … WIB”; kosongkan untuk diisi tangan.">
        <input type="time" className={INPUT} value={value.waktuMulai} onChange={(e) => onChange({ waktuMulai: e.target.value })} />
      </Field>
      <Field label="Waktu Selesai">
        <input type="time" className={INPUT} value={value.waktuSelesai} onChange={(e) => onChange({ waktuSelesai: e.target.value })} />
      </Field>
    </>
  );
}

/** Form Opening Meeting — waktu, agenda yang dibahas, catatan, nama penandatangan. */
function OpeningForm({
  scheme,
  value,
  onChange,
}: {
  scheme: "VKI" | "VIU";
  value: BeritaAcaraForms["opening"];
  onChange: (p: Partial<BeritaAcaraForms["opening"]>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <WaktuFields value={value} onChange={onChange} />
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-[11.5px] font-bold text-[#6b5b4c]">Agenda Opening Meeting yang dibahas</span>
        {OPENING_AGENDA(scheme).map((t, i) => (
          <label key={t} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#f0ded0] px-3 py-2 text-[12.5px] text-[#20180f]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.agenda.includes(i)}
              onChange={(e) => onChange({ agenda: e.target.checked ? [...value.agenda, i].sort() : value.agenda.filter((x) => x !== i) })}
            />
            <span>{t}</span>
          </label>
        ))}
      </div>
      <Field label="Catatan" hint="Kosongkan untuk mencetak baris kosong yang diisi tangan." wide>
        <textarea className={`${INPUT} min-h-28`} value={value.catatan} onChange={(e) => onChange({ catatan: e.target.value })} />
      </Field>
      <Field label="Penandatangan Lembaga Pelaksana">
        <input className={INPUT} value={value.ttdLembaga} onChange={(e) => onChange({ ttdLembaga: e.target.value })} />
      </Field>
      <Field label="Penandatangan Pemohon">
        <input className={INPUT} value={value.ttdPerusahaan} onChange={(e) => onChange({ ttdPerusahaan: e.target.value })} />
      </Field>
    </div>
  );
}

/** Daftar Hadir — peserta (nama, instansi, jabatan); tanda tangan tetap di kertas. */
function HadirForm({
  value,
  onChange,
  picNama,
  picJabatan,
  namaPerusahaan,
  lembaga,
}: {
  value: BeritaAcaraForms["hadir"];
  onChange: (p: Partial<BeritaAcaraForms["hadir"]>) => void;
  picNama: string;
  picJabatan: string;
  namaPerusahaan: string;
  lembaga: string;
}) {
  const peserta = value.peserta;
  const update = (i: number, patch: Partial<(typeof peserta)[number]>) => onChange({ peserta: peserta.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <WaktuFields value={value} onChange={onChange} />
      <div className="flex flex-col gap-2 md:col-span-2">
        <span className="text-[11.5px] font-bold text-[#6b5b4c]">Peserta</span>
        <span className="text-[11px] text-[#a68f80]">Dicetak berurutan, lalu baris kosong hingga 15 baris untuk peserta lain. Kolom tanda tangan diisi di lokasi.</span>
        {peserta.map((p, i) => (
          <div key={i} className="grid grid-cols-[24px_1fr_1fr_1fr_32px] items-center gap-2">
            <span className="text-[12px] text-[#8a7565]">{i + 1}.</span>
            <input className={INPUT} placeholder="Nama" value={p.nama} onChange={(e) => update(i, { nama: e.target.value })} />
            <input className={INPUT} placeholder="Instansi / Perusahaan" value={p.instansi} onChange={(e) => update(i, { instansi: e.target.value })} />
            <input className={INPUT} placeholder="Jabatan" value={p.jabatan} onChange={(e) => update(i, { jabatan: e.target.value })} />
            <button type="button" title="Hapus peserta" className={DEL_BTN} onClick={() => onChange({ peserta: peserta.filter((_, j) => j !== i) })}>
              <MaterialIcon name="delete" className="text-[16px]" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ADD_BTN} onClick={() => onChange({ peserta: [...peserta, { nama: "", instansi: "", jabatan: "" }] })}>
            <MaterialIcon name="add" className="text-[15px]" />
            Tambah Peserta
          </button>
          {picNama && !peserta.some((p) => p.nama === picNama) && (
            <button
              type="button"
              className={ADD_BTN}
              onClick={() => onChange({ peserta: [...peserta, { nama: picNama, instansi: namaPerusahaan, jabatan: picJabatan }] })}
            >
              <MaterialIcon name="person_add" className="text-[15px]" />
              Tambah PIC Pemohon ({picNama})
            </button>
          )}
          <button type="button" className={ADD_BTN} onClick={() => onChange({ peserta: [...peserta, { nama: "", instansi: lembaga, jabatan: "Verifikator" }] })}>
            <MaterialIcon name="badge" className="text-[15px]" />
            Tambah Tim {lembaga}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Berita Acara Klarifikasi — hal yang diklarifikasi, penjelasan perusahaan, keterangan. */
function BakForm({ value, onChange }: { value: BeritaAcaraForms["bak"]; onChange: (p: Partial<BeritaAcaraForms["bak"]>) => void }) {
  const items = value.items;
  const update = (i: number, patch: Partial<(typeof items)[number]>) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <WaktuFields value={value} onChange={onChange} />
      <div className="flex flex-col gap-2.5 md:col-span-2">
        <span className="text-[11.5px] font-bold text-[#6b5b4c]">Butir Klarifikasi</span>
        <span className="text-[11px] text-[#a68f80]">Kosongkan semua butir untuk mencetak tabel kosong 8 baris yang diisi tangan.</span>
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-[#f0ded0] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#20180f]">Butir {i + 1}</span>
              <button type="button" title="Hapus butir" className={DEL_BTN} onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}>
                <MaterialIcon name="delete" className="text-[16px]" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              <Field label="Hal yang Diklarifikasi">
                <textarea className={`${INPUT} min-h-20`} value={it.hal} onChange={(e) => update(i, { hal: e.target.value })} />
              </Field>
              <Field label="Penjelasan Perusahaan">
                <textarea className={`${INPUT} min-h-20`} value={it.penjelasan} onChange={(e) => update(i, { penjelasan: e.target.value })} />
              </Field>
              <Field label="Keterangan">
                <textarea className={`${INPUT} min-h-20`} value={it.keterangan} onChange={(e) => update(i, { keterangan: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className={ADD_BTN} onClick={() => onChange({ items: [...items, { hal: "", penjelasan: "", keterangan: "" }] })}>
            <MaterialIcon name="add" className="text-[15px]" />
            Tambah Butir Klarifikasi
          </button>
        </div>
      </div>
      <Field label="Penandatangan Verifikator">
        <input className={INPUT} value={value.ttdVerifikator} onChange={(e) => onChange({ ttdVerifikator: e.target.value })} />
      </Field>
      <Field label="Penandatangan Pihak Perusahaan">
        <input className={INPUT} value={value.ttdPerusahaan} onChange={(e) => onChange({ ttdPerusahaan: e.target.value })} />
      </Field>
    </div>
  );
}
