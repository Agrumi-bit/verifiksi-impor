"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { SearchSelectInput } from "@/components/form/search-select-input";
import { useHsCodeOptions } from "@/modules/applications/hooks/use-hs-code-options";
import { CountryNamesMultiSelect } from "@/modules/master-data/components/country-names-multi-select";
import { UnitSelect } from "@/modules/master-data/components/unit-select";

import { MaterialIcon } from "../material-icon";

/**
 * Add-row forms for the Verifikasi Jumlah Produksi tab. Each form only calls existing
 * verifikator endpoints (products, raw-materials, raw-material-conversions, production-data)
 * and reports back through onDone so the tab can refetch.
 */

export type ProductOption = { id: string; name: string; hsCode: string; deskripsi: string };
export type RawMaterialOption = { id: string; jenis: string; hsCode: string; hsDesc: string; deskripsi: string };

export type RawMaterialTopic = "penggunaan" | "stok" | "rencana-kebutuhan";
export type ProductRowSection = "sebelumnya" | "rencana" | "penjualan";

const NEW = "__new__";

const inputClass = "w-full rounded-md border border-[#e8dccd] bg-white px-2 py-1.5 text-[11.5px] text-[#20180f] outline-none";
const unitClass = `${inputClass} focus:border-[#e0662e]`;

async function callApi(assignmentId: string, path: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { ok: response.ok, json, error: (json?.error as string | undefined) ?? null };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">{label}</div>
      {children}
    </div>
  );
}

function FormShell({
  children,
  note,
  saving,
  onCancel,
  onSave,
}: {
  children: ReactNode;
  note?: string;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mb-3 rounded-lg border border-dashed border-[#2f6fe0] bg-[#f5f8fe] p-3.5">
      {children}
      {note && <p className="mb-2.5 text-[11px] text-[#8a7565]">{note}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-[13px]" />
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813]"
      >
        <MaterialIcon name="add" className="text-[14px]" />
        {label}
      </button>
    </div>
  );
}

export function DeleteRowButton({ title, disabled, onClick }: { title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-[#f1c4bd] bg-white p-1 text-[#dc2626] hover:bg-[#fdf1ef] disabled:opacity-50"
    >
      <MaterialIcon name="delete" className="text-[15px]" />
    </button>
  );
}

function productLabel(p: ProductOption) {
  return [p.name || p.deskripsi || "(tanpa nama)", p.hsCode].filter(Boolean).join(" — ");
}

function rawMaterialLabel(r: RawMaterialOption) {
  return [r.jenis || r.hsDesc || "(tanpa nama)", r.hsCode].filter(Boolean).join(" — ");
}

/* ------------------------------------------------------------------ bahan baku (3 tabel) */

/**
 * Penggunaan / Stok / Rencana Kebutuhan share one row list (one row per raw material × product).
 * Adds a raw material — an existing one not yet in the table, or a new one — with an optional
 * product pairing and the figure of the table it was opened from.
 */
export function AddRawMaterialForm({
  assignmentId,
  topic,
  products,
  availableRawMaterials,
  onCancel,
  onDone,
}: {
  assignmentId: string;
  topic: RawMaterialTopic;
  products: ProductOption[];
  /** Raw materials on the application that don't have a row in the table yet. */
  availableRawMaterials: RawMaterialOption[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const hsCodeOptions = useHsCodeOptions();
  const unitForHsCode = (hsCode: string) => (hsCode ? (hsCodeOptions.find((o) => o.value === hsCode)?.unit ?? "") : "");
  const [rawMaterialId, setRawMaterialId] = useState(NEW);
  const [jenis, setJenis] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [hsDesc, setHsDesc] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [kategori, setKategori] = useState<"BAHAN_BAKU" | "BAHAN_PENOLONG">("BAHAN_BAKU");
  const [productId, setProductId] = useState(products.length === 1 ? products[0].id : "");
  const [value, setValue] = useState("");
  const [dalamNegeri, setDalamNegeri] = useState("");
  const [luarNegeri, setLuarNegeri] = useState("");
  const [negaraAsal, setNegaraAsal] = useState("");
  const [satuan, setSatuan] = useState("");
  const [saving, setSaving] = useState(false);

  const isNew = rawMaterialId === NEW;
  const valueLabel = topic === "penggunaan" ? "Volume Penggunaan" : "Stok Terkini";

  async function save() {
    if (isNew && !jenis.trim() && !hsCode.trim()) {
      toast.error("Isi jenis bahan baku atau HS Code.");
      return;
    }
    setSaving(true);
    try {
      let id = rawMaterialId;
      let hs = hsCode;
      if (isNew) {
        const created = await callApi(assignmentId, "raw-materials", "POST", { jenis, hsCode, hsDesc, deskripsi });
        id = created.json?.data?.id;
        if (!created.ok || !id) {
          toast.error(created.error ?? "Gagal menambahkan bahan baku");
          return;
        }
      } else {
        hs = availableRawMaterials.find((r) => r.id === rawMaterialId)?.hsCode ?? "";
      }
      if (productId) {
        const conversion = await callApi(assignmentId, "raw-material-conversions", "POST", { productId, rawMaterialId: id, kategori });
        if (!conversion.ok) toast.error(conversion.error ?? "Bahan baku tersimpan, tetapi gagal menautkan ke produk");
      }
      const fields: Record<string, string> =
        topic === "rencana-kebutuhan"
          ? { rencanaKebutuhanDalamNegeri: dalamNegeri, rencanaKebutuhanLuarNegeri: luarNegeri, rencanaKebutuhanNegaraAsal: negaraAsal }
          : { [topic === "penggunaan" ? "penggunaan" : "dataStock"]: value };
      const unit = satuan || unitForHsCode(hs);
      if (unit) fields.satuan = unit;
      const usage = await callApi(assignmentId, "production-data", "PATCH", { source: "rawMaterialUsage", itemId: id, fields });
      if (!usage.ok) {
        toast.error(usage.error ?? "Bahan baku tersimpan, tetapi gagal menyimpan angkanya");
        return;
      }
      toast.success("Bahan baku/penolong ditambahkan.");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      saving={saving}
      onCancel={onCancel}
      onSave={save}
      note="Baris bahan baku dipakai bersama oleh tabel Penggunaan, Stok Terkini dan Rencana Kebutuhan; jika produk dipilih, juga muncul di Konversi."
    >
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Bahan Baku/Penolong">
          <select value={rawMaterialId} onChange={(e) => setRawMaterialId(e.target.value)} className={inputClass}>
            <option value={NEW}>+ Bahan baku baru</option>
            {availableRawMaterials.map((r) => (
              <option key={r.id} value={r.id}>
                {rawMaterialLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Untuk Produk">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            <option value="">— Tanpa produk —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {isNew && (
        <>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Jenis Bahan Baku/Penolong">
              <input type="text" value={jenis} onChange={(e) => setJenis(e.target.value)} className={inputClass} />
            </Field>
            <Field label="HS Code">
              <SearchSelectInput
                value={hsCode}
                onChange={setHsCode}
                onSelectOption={(option) => {
                  setHsCode(option.value);
                  setHsDesc(option.hint ?? "");
                  if (!satuan) setSatuan(unitForHsCode(option.value));
                }}
                options={hsCodeOptions}
                placeholder="Cari atau ketik HS Code..."
              />
            </Field>
          </div>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Uraian Barang (HS)">
              <input
                type="text"
                value={hsDesc}
                onChange={(e) => setHsDesc(e.target.value)}
                placeholder="Terisi otomatis dari master data HS Code"
                className={inputClass}
              />
            </Field>
            <Field label="Deskripsi Bahan Baku">
              <input type="text" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </>
      )}
      <div className={`mb-2.5 grid grid-cols-1 gap-2.5 ${topic === "rencana-kebutuhan" ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>
        {productId ? (
          <Field label="Kategori">
            <select value={kategori} onChange={(e) => setKategori(e.target.value as typeof kategori)} className={inputClass}>
              <option value="BAHAN_BAKU">Bahan Baku</option>
              <option value="BAHAN_PENOLONG">Bahan Penolong</option>
            </select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        {topic === "rencana-kebutuhan" ? (
          <>
            <Field label="Jumlah Dalam Negeri">
              <input type="text" inputMode="decimal" value={dalamNegeri} onChange={(e) => setDalamNegeri(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Jumlah Luar Negeri">
              <input type="text" inputMode="decimal" value={luarNegeri} onChange={(e) => setLuarNegeri(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Negara Asal">
              <CountryNamesMultiSelect value={negaraAsal} onChange={setNegaraAsal} />
            </Field>
          </>
        ) : (
          <Field label={valueLabel}>
            <input type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
          </Field>
        )}
        <Field label="Satuan">
          <UnitSelect value={satuan} onChange={setSatuan} placeholder="Pilih satuan" className={unitClass} />
        </Field>
      </div>
    </FormShell>
  );
}

/* ------------------------------------------------------------------ produk (3 tabel) */

/**
 * Sebelumnya / Rencana (one productionQty row per product) and Penjualan (one sales row per
 * product). Adds a row for a product that has none yet, or a brand-new product — which also
 * appears in Product Verification.
 */
export function AddProductRowForm({
  assignmentId,
  section,
  availableProducts,
  onCancel,
  onDone,
}: {
  assignmentId: string;
  section: ProductRowSection;
  /** Products on the application without a row in this table yet. */
  availableProducts: ProductOption[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const hsCodeOptions = useHsCodeOptions();
  const unitForHsCode = (hsCode: string) => (hsCode ? (hsCodeOptions.find((o) => o.value === hsCode)?.unit ?? "") : "");
  const [productId, setProductId] = useState(availableProducts[0]?.id ?? NEW);
  const [name, setName] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [hsDesc, setHsDesc] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [dalamNegeri, setDalamNegeri] = useState("");
  const [luarNegeri, setLuarNegeri] = useState("");
  const [negaraTujuan, setNegaraTujuan] = useState("");
  const [satuan, setSatuan] = useState("");
  const [saving, setSaving] = useState(false);

  const isNew = productId === NEW;

  async function save() {
    if (isNew && !name.trim() && !hsCode.trim()) {
      toast.error("Isi jenis produk atau HS Code.");
      return;
    }
    setSaving(true);
    try {
      let id = productId;
      let hs = hsCode;
      if (isNew) {
        const created = await callApi(assignmentId, "products", "POST", { materialType: name, hsCode, hsDesc, deskripsi });
        id = created.json?.data?.id;
        if (!created.ok || !id) {
          toast.error(created.error ?? "Gagal menambahkan produk");
          return;
        }
      } else {
        hs = availableProducts.find((p) => p.id === productId)?.hsCode ?? "";
      }
      const unit = satuan || unitForHsCode(hs);
      const fields: Record<string, string> =
        section === "penjualan"
          ? { dalamNegeri, luarNegeri, negaraTujuan }
          : { [section === "sebelumnya" ? "perTahunSebelumnya" : "perTahunRencana"]: jumlah };
      if (unit) fields.satuan = unit;
      const saved = await callApi(assignmentId, "production-data", "PATCH", {
        source: section === "penjualan" ? "sales" : "productionQty",
        itemId: id,
        fields,
      });
      if (!saved.ok) {
        toast.error(saved.error ?? "Produk tersimpan, tetapi gagal menyimpan angkanya");
        return;
      }
      toast.success(section === "penjualan" ? "Baris penjualan ditambahkan." : "Baris produksi ditambahkan.");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      saving={saving}
      onCancel={onCancel}
      onSave={save}
      note={
        section === "penjualan"
          ? "Produk baru juga ditambahkan ke Product Verification dan ke tabel Jumlah Produksi."
          : "Satu baris produk dipakai bersama oleh tabel Periode Satu Tahun Sebelumnya dan Rencana Tahun Berikutnya. Produk baru juga ditambahkan ke Product Verification dan Penjualan."
      }
    >
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Produk">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
            <option value={NEW}>+ Produk baru</option>
          </select>
        </Field>
        {isNew && (
          <Field label="Jenis Produk">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
        )}
      </div>
      {isNew && (
        <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Field label="HS Code">
            <SearchSelectInput
              value={hsCode}
              onChange={setHsCode}
              onSelectOption={(option) => {
                setHsCode(option.value);
                setHsDesc(option.hint ?? "");
                if (!satuan) setSatuan(unitForHsCode(option.value));
              }}
              options={hsCodeOptions}
              placeholder="Cari atau ketik HS Code..."
            />
          </Field>
          <Field label="Uraian Barang (HS)">
            <input type="text" value={hsDesc} onChange={(e) => setHsDesc(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Deskripsi Produk">
            <input type="text" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}
      <div className={`mb-2.5 grid grid-cols-1 gap-2.5 ${section === "penjualan" ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        {section === "penjualan" ? (
          <>
            <Field label="Penjualan Dalam Negeri">
              <input type="text" inputMode="decimal" value={dalamNegeri} onChange={(e) => setDalamNegeri(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Penjualan Luar Negeri">
              <input type="text" inputMode="decimal" value={luarNegeri} onChange={(e) => setLuarNegeri(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Negara Tujuan">
              <CountryNamesMultiSelect value={negaraTujuan} onChange={setNegaraTujuan} />
            </Field>
          </>
        ) : (
          <Field label={section === "sebelumnya" ? "Jumlah Produksi Satu Tahun Sebelumnya" : "Jumlah Rencana Produksi"}>
            <input type="text" inputMode="decimal" value={jumlah} onChange={(e) => setJumlah(e.target.value)} className={inputClass} />
          </Field>
        )}
        <Field label="Satuan">
          <UnitSelect value={satuan} onChange={setSatuan} placeholder="Pilih satuan" className={unitClass} />
        </Field>
      </div>
    </FormShell>
  );
}

/* ------------------------------------------------------------------ konversi */

/** Adds a product ↔ raw material conversion pairing (same data as Product Verification). */
export function AddConversionForm({
  assignmentId,
  products,
  rawMaterials,
  onCancel,
  onDone,
}: {
  assignmentId: string;
  products: ProductOption[];
  rawMaterials: RawMaterialOption[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [productId, setProductId] = useState(products.length === 1 ? products[0].id : "");
  const [rawMaterialId, setRawMaterialId] = useState("");
  const [kategori, setKategori] = useState<"BAHAN_BAKU" | "BAHAN_PENOLONG">("BAHAN_BAKU");
  const [volumeProduksiJumlah, setVolumeProduksiJumlah] = useState("");
  const [volumeProduksiSatuan, setVolumeProduksiSatuan] = useState("");
  const [volumeKebutuhanJumlah, setVolumeKebutuhanJumlah] = useState("");
  const [volumeKebutuhanSatuan, setVolumeKebutuhanSatuan] = useState("");
  const [rasioKonversi, setRasioKonversi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!productId || !rawMaterialId) {
      toast.error("Pilih produk dan bahan baku.");
      return;
    }
    setSaving(true);
    try {
      const saved = await callApi(assignmentId, "raw-material-conversions", "POST", {
        productId,
        rawMaterialId,
        kategori,
        volumeProduksiJumlah,
        volumeProduksiSatuan,
        volumeKebutuhanJumlah,
        volumeKebutuhanSatuan,
        rasioKonversi,
        keterangan,
      });
      if (!saved.ok) {
        toast.error(saved.error ?? "Gagal menambahkan konversi");
        return;
      }
      toast.success("Konversi ditambahkan.");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      saving={saving}
      onCancel={onCancel}
      onSave={save}
      note="Bahan baku baru ditambahkan lewat tabel Penggunaan Bahan Baku/Penolong; konversi ini juga tampil di Product Verification."
    >
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Field label="Jenis Produk">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            <option value="">— Pilih produk —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bahan Baku/Penolong">
          <select value={rawMaterialId} onChange={(e) => setRawMaterialId(e.target.value)} className={inputClass}>
            <option value="">— Pilih bahan baku —</option>
            {rawMaterials.map((r) => (
              <option key={r.id} value={r.id}>
                {rawMaterialLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kategori">
          <select value={kategori} onChange={(e) => setKategori(e.target.value as typeof kategori)} className={inputClass}>
            <option value="BAHAN_BAKU">Bahan Baku</option>
            <option value="BAHAN_PENOLONG">Bahan Penolong</option>
          </select>
        </Field>
      </div>
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        <Field label="Volume Produksi">
          <input type="text" inputMode="decimal" value={volumeProduksiJumlah} onChange={(e) => setVolumeProduksiJumlah(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Satuan Produksi">
          <UnitSelect value={volumeProduksiSatuan} onChange={setVolumeProduksiSatuan} placeholder="Pilih satuan" className={unitClass} />
        </Field>
        <Field label="Volume Kebutuhan">
          <input type="text" inputMode="decimal" value={volumeKebutuhanJumlah} onChange={(e) => setVolumeKebutuhanJumlah(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Satuan Kebutuhan">
          <UnitSelect value={volumeKebutuhanSatuan} onChange={setVolumeKebutuhanSatuan} placeholder="Pilih satuan" className={unitClass} />
        </Field>
        <Field label="Rasio Konversi">
          <input type="text" value={rasioKonversi} onChange={(e) => setRasioKonversi(e.target.value)} placeholder="mis. 1 : 3.356,3" className={inputClass} />
        </Field>
      </div>
      <div className="mb-2.5">
        <Field label="Keterangan">
          <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </FormShell>
  );
}
