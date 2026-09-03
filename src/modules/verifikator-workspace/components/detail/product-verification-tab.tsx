"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import {
  PRODUCT_VERIFICATION_STATUSES,
  PRODUCT_VERIFICATION_STATUS_BADGE,
  PRODUCT_VERIFICATION_STATUS_LABELS,
  type ProductVerificationStatusValue,
} from "../../status";
import type { AssignmentStatusValue } from "../../status";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { useHsCodeOptions } from "@/modules/applications/hooks/use-hs-code-options";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { FileUploadField } from "@/components/form/file-upload-field";

/** Indonesian number format: "." is the thousands separator, "," is the decimal separator. */
function parseNum(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = value.match(/-?[\d.,]+/);
  if (!match) return null;
  const n = Number(match[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Rasio Konversi is always derived from the two volumes, never hand-typed — expressed as "1 : X" (produk per 1 unit bahan baku). */
function computeRasio(volumeKebutuhan: string, volumeProduksi: string): string {
  const kebutuhan = parseNum(volumeKebutuhan);
  const produksi = parseNum(volumeProduksi);
  if (kebutuhan === null || produksi === null || kebutuhan === 0) return "";
  const ratio = produksi / kebutuhan;
  return `1 : ${ratio.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

type ProductRow = {
  id: string;
  kategori: string;
  materialType: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
  photoPath: string | null;
  status: ProductVerificationStatusValue;
  note: string;
  verifiedAt: string | null;
};

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

const RAW_MATERIAL_CONVERSION_KATEGORI_LABELS: Record<string, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

type ConversionDraft = {
  rawMaterialId: string;
  kategori: string;
  volumeProduksiJumlah: string;
  volumeProduksiSatuan: string;
  volumeKebutuhanJumlah: string;
  volumeKebutuhanSatuan: string;
  rasioKonversi: string;
  keterangan: string;
};

const EMPTY_CONVERSION_DRAFT: ConversionDraft = {
  rawMaterialId: "",
  kategori: "",
  volumeProduksiJumlah: "",
  volumeProduksiSatuan: "",
  volumeKebutuhanJumlah: "",
  volumeKebutuhanSatuan: "",
  rasioKonversi: "",
  keterangan: "",
};

/** "Nama Bahan Baku" is a hybrid select-or-type field: `ref` is either an existing raw
 * material's id (picked from the list) or the freshly typed name (no match yet, so this
 * becomes a brand-new raw material on save). `jenis`/`hsCode`/`hsDesc`/`photoPath` are always
 * editable — auto-filled from the picked material, or blank for a new one — and get written
 * back (via the raw-materials endpoint) whether the material is new or being corrected here. */
type MaterialLinkDraft = {
  ref: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string;
};

const EMPTY_MATERIAL_LINK_DRAFT: MaterialLinkDraft = {
  ref: "",
  jenis: "",
  hsCode: "",
  hsDesc: "",
  deskripsi: "",
  photoPath: "",
};

function ConversionForm({
  draft,
  onChange,
  rawMaterials,
  productHsCode,
  onSave,
  onCancel,
  saving,
  materialLink,
}: {
  draft: ConversionDraft;
  onChange: (patch: Partial<ConversionDraft>) => void;
  rawMaterials: { id: string; jenis?: string; hsCode?: string; hsDesc?: string; deskripsi?: string; photoPath?: string }[];
  productHsCode: string;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  /** Present only for the "Tambah Bahan Baku" (add) form — replaces the existing-only picker
   * with the full Nama/Kategori/HS Code/Uraian HS Code/Foto field set. Omitted for the
   * edit-conversion form, which only relinks an already-existing raw material. */
  materialLink?: {
    draft: MaterialLinkDraft;
    onChange: (patch: Partial<MaterialLinkDraft>) => void;
  };
}) {
  const hsCodeOptions = useHsCodeOptions();
  const unitForHsCode = (hsCode: string | undefined) => hsCodeOptions.find((o) => o.value === hsCode)?.unit ?? "";
  const selectedRawMaterial = rawMaterials.find((rm) => rm.id === draft.rawMaterialId);
  const bahanBakuSatuan = materialLink
    ? unitForHsCode(materialLink.draft.hsCode)
    : unitForHsCode(selectedRawMaterial?.hsCode);
  const produkSatuan = unitForHsCode(productHsCode);
  const rawMaterialOptions = rawMaterials.map((rm) => ({
    value: rm.id,
    label: rm.jenis || "—",
    hint: rm.hsCode ? `HS Code: ${rm.hsCode}` : undefined,
  }));
  const canSave = materialLink
    ? Boolean(materialLink.draft.jenis.trim() && materialLink.draft.hsCode.trim())
    : Boolean(draft.rawMaterialId);

  return (
    <div className="rounded-xl border border-dashed border-[#2f6fe0] bg-[#f5f8fe] p-4">
      {materialLink ? (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Nama Bahan Baku</div>
              <SearchSelectInput
                value={materialLink.draft.ref}
                onChange={(value) => materialLink.onChange({ ref: value, jenis: value })}
                onSelectOption={(option) => {
                  const rm = rawMaterials.find((r) => r.id === option.value);
                  materialLink.onChange({
                    ref: option.value,
                    jenis: option.label,
                    hsCode: rm?.hsCode ?? "",
                    hsDesc: rm?.hsDesc ?? "",
                    deskripsi: rm?.deskripsi ?? "",
                    photoPath: rm?.photoPath ?? "",
                  });
                }}
                options={rawMaterialOptions}
                placeholder="Cari atau ketik nama bahan baku..."
              />
            </div>
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Kategori</div>
              <select
                value={draft.kategori}
                onChange={(e) => onChange({ kategori: e.target.value })}
                className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
              >
                <option value="">—</option>
                {Object.entries(RAW_MATERIAL_CONVERSION_KATEGORI_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
              <SearchSelectInput
                value={materialLink.draft.hsCode}
                onChange={(value) => materialLink.onChange({ hsCode: value })}
                onSelectOption={(option) => materialLink.onChange({ hsCode: option.value, hsDesc: option.hint ?? "" })}
                options={hsCodeOptions}
                placeholder="Cari atau ketik HS Code..."
              />
            </div>
            <div>
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Uraian HS Code</div>
              <input
                type="text"
                value={materialLink.draft.hsDesc}
                onChange={(e) => materialLink.onChange({ hsDesc: e.target.value })}
                placeholder="Terisi otomatis saat memilih HS Code"
                className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
              />
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Bahan Baku</div>
            <textarea
              rows={2}
              value={materialLink.draft.deskripsi}
              onChange={(e) => materialLink.onChange({ deskripsi: e.target.value })}
              className="w-full rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
            />
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Unggah Foto</div>
            <FileUploadField
              namespace="photos"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              label="Unggah Foto"
              value={materialLink.draft.photoPath}
              onChange={(path) => materialLink.onChange({ photoPath: path ?? "" })}
            />
          </div>
        </>
      ) : (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Bahan Baku</div>
            <SearchSelectInput
              value={draft.rawMaterialId}
              onChange={(value) => onChange({ rawMaterialId: value })}
              options={rawMaterialOptions}
              placeholder="Cari bahan baku..."
              allowFreeText={false}
            />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Kategori</div>
            <select
              value={draft.kategori}
              onChange={(e) => onChange({ kategori: e.target.value })}
              className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
            >
              <option value="">—</option>
              {Object.entries(RAW_MATERIAL_CONVERSION_KATEGORI_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="mb-3 rounded-lg border border-[#e1bfb3] bg-white p-3">
        <div className="text-[12px] font-bold text-[#20180f]">Rasio Konversi Bahan Baku ke Produk</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-[#8a7565]">
          Perbandingan yang menunjukkan seberapa efisien bahan baku diubah menjadi produk jadi. Contoh: 1 kg benang katun diubah menjadi 4
          meter kain jadi (rasio 1:4).
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jumlah Bahan Baku</div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draft.volumeKebutuhanJumlah}
              onChange={(e) => onChange({ volumeKebutuhanJumlah: e.target.value })}
              placeholder="Volume"
              className="w-full min-w-0 rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
            />
            <div className="flex w-20 shrink-0 items-center justify-center rounded-lg border border-[#e8dccd] bg-[#f7f2ec] px-2 py-2.5 text-[12.5px] text-[#8a7565]">
              {bahanBakuSatuan || "satuan"}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-[#a68f80]">Satuan mengikuti HS Code bahan baku</div>
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Menghasilkan Produk</div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draft.volumeProduksiJumlah}
              onChange={(e) => onChange({ volumeProduksiJumlah: e.target.value })}
              placeholder="Volume"
              className="w-full min-w-0 rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
            />
            <div className="flex w-20 shrink-0 items-center justify-center rounded-lg border border-[#e8dccd] bg-[#f7f2ec] px-2 py-2.5 text-[12.5px] text-[#8a7565]">
              {produkSatuan || "satuan"}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-[#a68f80]">Satuan mengikuti HS Code produk</div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Rasio Konversi (otomatis)</div>
          <div className="rounded-lg border border-[#e8dccd] bg-[#f7f2ec] px-3 py-2.5 text-[12.5px] font-bold text-[#20180f]">
            {computeRasio(draft.volumeKebutuhanJumlah, draft.volumeProduksiJumlah) || "—"}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Keterangan</div>
          <input
            type="text"
            value={draft.keterangan}
            onChange={(e) => onChange({ keterangan: e.target.value })}
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-[15px]" />
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

type ProductDraft = {
  kategori: string;
  materialType: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string;
};

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  kategori: "",
  materialType: "",
  hsCode: "",
  hsDesc: "",
  deskripsi: "",
  photoPath: "",
};

function ProductForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const hsCodeOptions = useHsCodeOptions();

  return (
    <div className="rounded-xl border border-dashed border-[#2f6fe0] bg-[#f5f8fe] p-5.5">
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Produk</div>
          <input
            type="text"
            value={draft.materialType}
            onChange={(e) => onChange({ materialType: e.target.value })}
            placeholder="cth: Loafers"
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
          <SearchSelectInput
            value={draft.hsCode}
            onChange={(value) => onChange({ hsCode: value })}
            onSelectOption={(option) => onChange({ hsCode: option.value, hsDesc: option.hint ?? "" })}
            options={hsCodeOptions}
            placeholder="Cari atau ketik HS Code..."
          />
        </div>
      </div>
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Kategori</div>
          <input
            type="text"
            value={draft.kategori}
            onChange={(e) => onChange({ kategori: e.target.value })}
            placeholder="cth: Alas Kaki"
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
          <input
            type="text"
            value={draft.hsDesc}
            onChange={(e) => onChange({ hsDesc: e.target.value })}
            placeholder="Terisi otomatis saat memilih HS Code"
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
      </div>
      <div className="mb-3.5">
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Produk</div>
        <textarea
          rows={2}
          value={draft.deskripsi}
          onChange={(e) => onChange({ deskripsi: e.target.value })}
          className="w-full rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
        />
      </div>
      <div className="mb-3.5">
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Foto Produk</div>
        <FileUploadField
          namespace="photos"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          label="Unggah Foto"
          value={draft.photoPath}
          onChange={(path) => onChange({ photoPath: path ?? "" })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !draft.materialType.trim() || !draft.hsCode.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-[15px]" />
          {saving ? "Menyimpan..." : "Simpan Produk"}
        </button>
      </div>
    </div>
  );
}

type RawMaterialDraft = {
  jenis: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string;
};

const EMPTY_RAW_MATERIAL_DRAFT: RawMaterialDraft = {
  jenis: "",
  hsCode: "",
  hsDesc: "",
  deskripsi: "",
  photoPath: "",
};

function RawMaterialForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: RawMaterialDraft;
  onChange: (patch: Partial<RawMaterialDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const hsCodeOptions = useHsCodeOptions();

  return (
    <div className="rounded-xl border border-dashed border-[#2f6fe0] bg-[#f5f8fe] p-5.5">
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Bahan Baku</div>
          <input
            type="text"
            value={draft.jenis}
            onChange={(e) => onChange({ jenis: e.target.value })}
            placeholder="cth: Benang Katun"
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
          <SearchSelectInput
            value={draft.hsCode}
            onChange={(value) => onChange({ hsCode: value })}
            onSelectOption={(option) => onChange({ hsCode: option.value, hsDesc: option.hint ?? "" })}
            options={hsCodeOptions}
            placeholder="Cari atau ketik HS Code..."
          />
        </div>
      </div>
      <div className="mb-3.5">
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
        <input
          type="text"
          value={draft.hsDesc}
          onChange={(e) => onChange({ hsDesc: e.target.value })}
          placeholder="Terisi otomatis saat memilih HS Code"
          className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
        />
      </div>
      <div className="mb-3.5">
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Bahan Baku</div>
        <textarea
          rows={2}
          value={draft.deskripsi}
          onChange={(e) => onChange({ deskripsi: e.target.value })}
          className="w-full rounded-lg border border-[#e8dccd] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
        />
      </div>
      <div className="mb-3.5">
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Foto Bahan Baku</div>
        <FileUploadField
          namespace="photos"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          label="Unggah Foto"
          value={draft.photoPath}
          onChange={(path) => onChange({ photoPath: path ?? "" })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !draft.jenis.trim() || !draft.hsCode.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-[15px]" />
          {saving ? "Menyimpan..." : "Simpan Bahan Baku"}
        </button>
      </div>
    </div>
  );
}

type Props = {
  assignmentId: string;
  assignmentStatus: AssignmentStatusValue;
  payload: ApplicationWizardValues;
  focusProductId?: string | null;
  focusConversionId?: string | null;
  onFocusHandled?: () => void;
};

export function ProductVerificationTab({
  assignmentId,
  assignmentStatus,
  payload,
  focusProductId,
  focusConversionId,
  onFocusHandled,
}: Props) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  // This tab remounts fresh every time it's navigated to (parent renders it conditionally on
  // activeTab), so seeding from focusProductId at init time — not an effect — expands the right
  // product's Bahan Baku section on arrival from the "klik uraian barang" link.
  const [expandedId, setExpandedId] = useState<string | null>(() => focusProductId ?? null);
  const [addingForProductId, setAddingForProductId] = useState<string | null>(null);
  const [newConversion, setNewConversion] = useState<ConversionDraft>(EMPTY_CONVERSION_DRAFT);
  const [editingConversionId, setEditingConversionId] = useState<string | null>(null);
  const [editConversion, setEditConversion] = useState<ConversionDraft>(EMPTY_CONVERSION_DRAFT);
  const [savingConversionId, setSavingConversionId] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [duplicatingProductId, setDuplicatingProductId] = useState<string | null>(null);
  const [materialLinkDraft, setMaterialLinkDraft] = useState<MaterialLinkDraft>(EMPTY_MATERIAL_LINK_DRAFT);
  const [editingRawMaterialId, setEditingRawMaterialId] = useState<string | null>(null);
  const [editRawMaterial, setEditRawMaterial] = useState<RawMaterialDraft>(EMPTY_RAW_MATERIAL_DRAFT);
  const [savingRawMaterialId, setSavingRawMaterialId] = useState<string | null>(null);
  const [deletingRawMaterialId, setDeletingRawMaterialId] = useState<string | null>(null);
  const [duplicatingConversionId, setDuplicatingConversionId] = useState<string | null>(null);
  const canEdit = assignmentStatus === "SUBMITTED";
  const hsCodeOptions = useHsCodeOptions();
  const unitForHsCode = (hsCode: string | undefined) => hsCodeOptions.find((o) => o.value === hsCode)?.unit ?? "";
  // hsDesc on products/rawMaterials is a snapshot frozen at wizard submission time — if the HS
  // Code wasn't registered in master data yet, it saved empty and stays empty forever. Fall back
  // to a live master-data lookup so a description added later still shows up here.
  const descForHsCode = (hsCode: string | undefined) => hsCodeOptions.find((o) => o.value === hsCode)?.hint ?? "";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "products"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`);
      if (!response.ok) throw new Error("Gagal memuat daftar produk");
      const json = (await response.json()) as { data: ProductRow[] };
      return json.data;
    },
  });

  const rows = data ?? [];
  const rawMaterials = payload.rawMaterials ?? [];
  const rawMaterialConversions = payload.rawMaterialConversions ?? [];

  // Scroll to + briefly ring-highlight the target conversion row once its product section has
  // rendered (expandedId was already seeded above, so this only waits on the async product list).
  // Highlight is done via direct DOM classList, not React state, since it's a fire-and-forget
  // timed effect with nothing else in the render depending on it.
  useEffect(() => {
    if (!focusConversionId) return;
    const el = document.getElementById(`raw-material-conversion-${focusConversionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#2f6fe0]", "border-[#2f6fe0]", "bg-[#f5f8fe]");
    onFocusHandled?.();
    const timeout = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#2f6fe0]", "border-[#2f6fe0]", "bg-[#f5f8fe]");
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [focusConversionId, data, onFocusHandled]);

  async function handleDecision(row: ProductRow, status: ProductVerificationStatusValue) {
    setSavingId(row.id);
    const note = draftNotes[row.id] ?? row.note;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status, note }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status produk");
      return;
    }
    toast.success(`${row.materialType} ditandai ${PRODUCT_VERIFICATION_STATUS_LABELS[status]}.`);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  async function handleAddProduct() {
    if (!newProduct.materialType.trim() || !newProduct.hsCode.trim()) return;
    setSavingProduct(true);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });
    setSavingProduct(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menambahkan produk");
      return;
    }
    toast.success("Produk baru ditambahkan.");
    setIsAddingProduct(false);
    setNewProduct(EMPTY_PRODUCT_DRAFT);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  function startEditProduct(row: ProductRow) {
    setEditingProductId(row.id);
    setEditProduct({
      kategori: row.kategori,
      materialType: row.materialType,
      hsCode: row.hsCode,
      hsDesc: row.hsDesc,
      deskripsi: row.deskripsi,
      photoPath: row.photoPath ?? "",
    });
  }

  async function handleSaveEditProduct(productId: string) {
    if (!editProduct.materialType.trim() || !editProduct.hsCode.trim()) return;
    setSavingId(productId);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId, productData: editProduct }),
    });
    setSavingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan produk");
      return;
    }
    toast.success("Produk diperbarui.");
    setEditingProductId(null);
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingProductId(productId);
    const response = await fetch(
      `/api/verifikator-workspace/assignments/${assignmentId}/products?productId=${encodeURIComponent(productId)}`,
      { method: "DELETE" },
    );
    setDeletingProductId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menghapus produk");
      return;
    }
    toast.success("Produk dihapus.");
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  /**
   * Copies a product the applicant already listed (same HS Code/kategori/deskripsi/photo) into a
   * new row, so a near-duplicate product doesn't have to be retyped from scratch — just
   * duplicated and then adjusted via Edit. Uses the same POST endpoint "Tambah Produk" uses.
   */
  async function handleDuplicateProduct(row: ProductRow) {
    setDuplicatingProductId(row.id);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kategori: row.kategori,
        materialType: `${row.materialType} (Salinan)`,
        hsCode: row.hsCode,
        hsDesc: row.hsDesc,
        deskripsi: row.deskripsi,
        photoPath: row.photoPath ?? "",
      }),
    });
    setDuplicatingProductId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menduplikat produk");
      return;
    }
    toast.success("Produk diduplikat.");
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  function invalidateAfterConversionChange() {
    queryClient.invalidateQueries({ queryKey: ["verifikator-workspace", "assignments", "detail", assignmentId] });
  }

  async function handleAddConversion(productId: string) {
    if (!materialLinkDraft.jenis.trim() || !materialLinkDraft.hsCode.trim()) return;
    setSavingConversionId("new");

    const existingRawMaterial = rawMaterials.find((r) => r.id === materialLinkDraft.ref);
    const rawMaterialData = {
      jenis: materialLinkDraft.jenis,
      hsCode: materialLinkDraft.hsCode,
      hsDesc: materialLinkDraft.hsDesc,
      deskripsi: materialLinkDraft.deskripsi,
      photoPath: materialLinkDraft.photoPath,
    };
    let rawMaterialId: string;
    if (existingRawMaterial) {
      // Picked an existing raw material — persist any corrections made to its own fields here
      // (name/HS Code/uraian/foto) too, not just the conversion link.
      rawMaterialId = existingRawMaterial.id;
      const patchResponse = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-materials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rawMaterialId, rawMaterialData }),
      });
      if (!patchResponse.ok) {
        setSavingConversionId(null);
        const body = await patchResponse.json().catch(() => null);
        toast.error(body?.error ?? "Gagal menyimpan bahan baku");
        return;
      }
    } else {
      // No match — the typed name is a brand-new raw material, create it first.
      const createResponse = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawMaterialData),
      });
      if (!createResponse.ok) {
        setSavingConversionId(null);
        const body = await createResponse.json().catch(() => null);
        toast.error(body?.error ?? "Gagal menambahkan bahan baku");
        return;
      }
      const created = (await createResponse.json()) as { data: { id: string } };
      rawMaterialId = created.data.id;
    }

    const product = rows.find((r) => r.id === productId);
    const rasioKonversi = computeRasio(newConversion.volumeKebutuhanJumlah, newConversion.volumeProduksiJumlah);
    const volumeKebutuhanSatuan = unitForHsCode(materialLinkDraft.hsCode);
    const volumeProduksiSatuan = unitForHsCode(product?.hsCode);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-material-conversions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        ...newConversion,
        rawMaterialId,
        rasioKonversi,
        volumeKebutuhanSatuan,
        volumeProduksiSatuan,
      }),
    });
    setSavingConversionId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Bahan baku disimpan, tapi gagal menautkan ke produk");
      return;
    }
    toast.success("Bahan baku ditambahkan ke produk.");
    setAddingForProductId(null);
    setNewConversion(EMPTY_CONVERSION_DRAFT);
    setMaterialLinkDraft(EMPTY_MATERIAL_LINK_DRAFT);
    invalidateAfterConversionChange();
  }

  function startEditConversion(conversionId: string, current: ConversionDraft) {
    setEditingConversionId(conversionId);
    setEditConversion(current);
  }

  async function handleSaveEditConversion(conversionId: string) {
    setSavingConversionId(conversionId);
    const existing = rawMaterialConversions.find((c) => c.id === conversionId);
    const product = rows.find((r) => r.id === existing?.productId);
    const rawMaterial = rawMaterials.find((r) => r.id === editConversion.rawMaterialId);
    const rasioKonversi = computeRasio(editConversion.volumeKebutuhanJumlah, editConversion.volumeProduksiJumlah);
    const volumeKebutuhanSatuan = unitForHsCode(rawMaterial?.hsCode);
    const volumeProduksiSatuan = unitForHsCode(product?.hsCode);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-material-conversions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversionId, ...editConversion, rasioKonversi, volumeKebutuhanSatuan, volumeProduksiSatuan }),
    });
    setSavingConversionId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan bahan baku");
      return;
    }
    toast.success("Bahan baku diperbarui.");
    setEditingConversionId(null);
    invalidateAfterConversionChange();
  }

  async function handleDeleteConversion(conversionId: string) {
    setSavingConversionId(conversionId);
    const response = await fetch(
      `/api/verifikator-workspace/assignments/${assignmentId}/raw-material-conversions?conversionId=${encodeURIComponent(conversionId)}`,
      { method: "DELETE" },
    );
    setSavingConversionId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menghapus bahan baku");
      return;
    }
    toast.success("Bahan baku dihapus.");
    invalidateAfterConversionChange();
  }

  /**
   * Copies a raw material already linked to this product (same jenis/HS Code/deskripsi/photo)
   * into a new raw material + a new link with the same ratio/kategori/keterangan — for the case
   * where the same raw material (or a near-identical one) is used again, so neither the material
   * nor the conversion has to be retyped.
   */
  async function handleDuplicateConversion(
    productId: string,
    conversionId: string,
    material: {
      jenis: string;
      hsCode: string;
      hsDesc: string;
      deskripsi: string;
      photoPath: string;
      kategori: string;
      volumeProduksiJumlah: string;
      volumeProduksiSatuan: string;
      volumeKebutuhanJumlah: string;
      volumeKebutuhanSatuan: string;
      rasioKonversi: string;
      keterangan: string;
    },
  ) {
    setDuplicatingConversionId(conversionId);
    const createResponse = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jenis: `${material.jenis} (Salinan)`,
        hsCode: material.hsCode,
        hsDesc: material.hsDesc,
        deskripsi: material.deskripsi,
        photoPath: material.photoPath,
      }),
    });
    if (!createResponse.ok) {
      setDuplicatingConversionId(null);
      const body = await createResponse.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menduplikat bahan baku");
      return;
    }
    const created = (await createResponse.json()) as { data: { id: string } };
    const linkResponse = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-material-conversions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rawMaterialId: created.data.id,
        kategori: material.kategori,
        volumeProduksiJumlah: material.volumeProduksiJumlah,
        volumeProduksiSatuan: material.volumeProduksiSatuan,
        volumeKebutuhanJumlah: material.volumeKebutuhanJumlah,
        volumeKebutuhanSatuan: material.volumeKebutuhanSatuan,
        rasioKonversi: material.rasioKonversi,
        keterangan: material.keterangan,
      }),
    });
    setDuplicatingConversionId(null);
    if (!linkResponse.ok) {
      const body = await linkResponse.json().catch(() => null);
      toast.error(body?.error ?? "Bahan baku diduplikat, tapi gagal menautkan ke produk");
      invalidateAfterConversionChange();
      return;
    }
    toast.success("Bahan baku diduplikat.");
    invalidateAfterConversionChange();
  }

  function startEditRawMaterial(rawMaterialId: string, current: RawMaterialDraft) {
    setEditingRawMaterialId(rawMaterialId);
    setEditRawMaterial(current);
  }

  async function handleSaveEditRawMaterial(rawMaterialId: string) {
    if (!editRawMaterial.jenis.trim() || !editRawMaterial.hsCode.trim()) return;
    setSavingRawMaterialId(rawMaterialId);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/raw-materials`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rawMaterialId, rawMaterialData: editRawMaterial }),
    });
    setSavingRawMaterialId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan bahan baku");
      return;
    }
    toast.success("Bahan baku diperbarui.");
    setEditingRawMaterialId(null);
    invalidateAfterConversionChange();
  }

  async function handleDeleteRawMaterial(rawMaterialId: string) {
    setDeletingRawMaterialId(rawMaterialId);
    const response = await fetch(
      `/api/verifikator-workspace/assignments/${assignmentId}/raw-materials?rawMaterialId=${encodeURIComponent(rawMaterialId)}`,
      { method: "DELETE" },
    );
    setDeletingRawMaterialId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menghapus bahan baku");
      return;
    }
    toast.success("Bahan baku dihapus.");
    invalidateAfterConversionChange();
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat daftar produk...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="inventory_2" className="text-[19px] text-[#e0662e]" />
            <h3 className="text-[14.5px] font-extrabold text-[#20180f]">Product Verification</h3>
            <span className="rounded-full bg-[#fdeadd] px-2.5 py-0.5 text-[11px] font-bold text-[#c14a1f]">
              {rows.length} Produk
            </span>
          </div>
          {canEdit && !isAddingProduct && (
            <button
              type="button"
              onClick={() => {
                setIsAddingProduct(true);
                setNewProduct(EMPTY_PRODUCT_DRAFT);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813]"
            >
              <MaterialIcon name="add" className="text-[15px]" />
              Tambah Produk
            </button>
          )}
        </div>
        <p className="text-[13px] text-[#8a7565]">
          Memastikan produk yang diajukan sesuai ruang lingkup program verifikasi dan didukung oleh hasil survey.
          {!canEdit && " Assignment ini tidak lagi berstatus Submitted — keputusan produk bersifat baca saja."}
        </p>
      </div>

      {isAddingProduct && (
        <ProductForm
          draft={newProduct}
          onChange={(patch) => setNewProduct((prev) => ({ ...prev, ...patch }))}
          onSave={handleAddProduct}
          onCancel={() => setIsAddingProduct(false)}
          saving={savingProduct}
        />
      )}

      {rows.length === 0 && !isAddingProduct && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#8a7565]">
          Tidak ada produk yang diajukan pada aplikasi ini.
        </p>
      )}

      {rows.map((row, productIndex) => {
        const materials = rawMaterialConversions
          .filter((c) => c.productId === row.id)
          .map((c) => {
            const rm = rawMaterials.find((r) => r.id === c.rawMaterialId);
            return {
              id: c.id,
              rawMaterialId: c.rawMaterialId ?? "",
              jenis: rm?.jenis ?? "",
              hsCode: rm?.hsCode ?? "",
              hsDesc: rm?.hsDesc || descForHsCode(rm?.hsCode),
              deskripsi: rm?.deskripsi ?? "",
              photoPath: rm?.photoPath ?? "",
              kategori: c.kategori ?? "",
              volumeProduksiJumlah: c.volumeProduksiJumlah ?? "",
              volumeProduksiSatuan: c.volumeProduksiSatuan ?? "",
              volumeKebutuhanJumlah: c.volumeKebutuhanJumlah ?? "",
              volumeKebutuhanSatuan: c.volumeKebutuhanSatuan ?? "",
              rasioKonversi: c.rasioKonversi ?? "",
              keterangan: c.keterangan ?? "",
            };
          });
        const isExpanded = expandedId === row.id;
        if (editingProductId === row.id) {
          return (
            <ProductForm
              key={row.id}
              draft={editProduct}
              onChange={(patch) => setEditProduct((prev) => ({ ...prev, ...patch }))}
              onSave={() => handleSaveEditProduct(row.id)}
              onCancel={() => setEditingProductId(null)}
              saving={savingId === row.id}
            />
          );
        }
        return (
          <div key={row.id} className="rounded-xl border border-[#e0662e] bg-white p-5.5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-1 flex-wrap gap-5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fdeadd] text-[13px] font-extrabold text-[#e0662e]">
                  {productIndex + 1}
                </div>
                {row.photoPath ? (
                  <a href={fileHref(row.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileHref(row.photoPath)}
                      alt={row.materialType}
                      className="aspect-square w-27.5 rounded-lg border border-[#e8dccd] object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-square w-27.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[9.5px] text-[#5a7a63]">
                    Belum ada foto
                  </div>
                )}

                <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
                  <div className="min-w-40">
                    {row.kategori && <div className="text-[15px] font-extrabold text-[#20180f]">{row.kategori}</div>}
                    <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Produk</div>
                    <div className="text-[19px] font-extrabold text-[#e0662e]">{row.materialType || "—"}</div>
                  </div>
                  <div className="min-w-35">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                    <div className="font-mono text-[19px] font-extrabold text-[#20180f]">{row.hsCode || "—"}</div>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${PRODUCT_VERIFICATION_STATUS_BADGE[row.status]}`}>
                  {PRODUCT_VERIFICATION_STATUS_LABELS[row.status]}
                </span>
                {canEdit && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEditProduct(row)}
                      className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="edit" className="text-[13px]" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={duplicatingProductId === row.id}
                      onClick={() => handleDuplicateProduct(row)}
                      className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813] disabled:opacity-50"
                    >
                      <MaterialIcon name="content_copy" className="text-[13px]" />
                      Duplikat
                    </button>
                    <button
                      type="button"
                      disabled={deletingProductId === row.id}
                      onClick={() => handleDeleteProduct(row.id)}
                      className="flex items-center gap-1 rounded-lg border border-[#dc2626] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#dc2626] disabled:opacity-50"
                    >
                      <MaterialIcon name="delete" className="text-[13px]" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Produk</div>
                <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                  {row.deskripsi || "—"}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
                <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                  {row.hsDesc || descForHsCode(row.hsCode) || "—"}
                </div>
              </div>
            </div>

            <textarea
              className="mb-2 w-full rounded-lg border border-[#f0ded0] p-2.5 text-[12.5px] text-[#4a4038] outline-none disabled:bg-[#f7f2ec]"
              rows={2}
              placeholder="Catatan ketidaksesuaian (opsional)..."
              defaultValue={row.note}
              disabled={!canEdit}
              onChange={(e) => setDraftNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
            />

            {canEdit && (
              <div className="mb-3 flex flex-wrap gap-2">
                {PRODUCT_VERIFICATION_STATUSES.filter((s) => s !== "PENDING").map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => handleDecision(row, status)}
                    className={
                      "rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50 " +
                      (row.status === status
                        ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]"
                        : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
                    }
                  >
                    {PRODUCT_VERIFICATION_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            )}

            {row.verifiedAt && (
              <div className="mb-3 text-[10.5px] text-[#8a7565]">
                Diverifikasi: {new Date(row.verifiedAt).toLocaleString("id-ID")}
              </div>
            )}

            {(materials.length > 0 || canEdit) && (
              <div className="border-t border-[#f0ded0] pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-[#8a7565]"
                  >
                    <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[16px]" />
                    Bahan Baku yang Digunakan ({materials.length})
                  </button>
                  {canEdit && isExpanded && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingForProductId(row.id);
                        setNewConversion(EMPTY_CONVERSION_DRAFT);
                        setMaterialLinkDraft(EMPTY_MATERIAL_LINK_DRAFT);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813]"
                    >
                      <MaterialIcon name="add" className="text-[14px]" />
                      Tambah Bahan Baku
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-3.5">
                    {materials.length === 0 && addingForProductId !== row.id && (
                      <p className="text-[12px] text-[#a68f80]">Belum ada bahan baku yang ditautkan ke produk ini.</p>
                    )}
                    {addingForProductId === row.id && (
                      <ConversionForm
                        draft={newConversion}
                        onChange={(patch) => setNewConversion((prev) => ({ ...prev, ...patch }))}
                        rawMaterials={rawMaterials}
                        productHsCode={row.hsCode}
                        onSave={() => handleAddConversion(row.id)}
                        onCancel={() => {
                          setAddingForProductId(null);
                          setMaterialLinkDraft(EMPTY_MATERIAL_LINK_DRAFT);
                        }}
                        saving={savingConversionId === "new"}
                        materialLink={{
                          draft: materialLinkDraft,
                          onChange: (patch) => setMaterialLinkDraft((prev) => ({ ...prev, ...patch })),
                        }}
                      />
                    )}
                    {materials.map((m) =>
                      editingConversionId === m.id ? (
                        <ConversionForm
                          key={m.id}
                          draft={editConversion}
                          onChange={(patch) => setEditConversion((prev) => ({ ...prev, ...patch }))}
                          rawMaterials={rawMaterials}
                          productHsCode={row.hsCode}
                          onSave={() => handleSaveEditConversion(m.id)}
                          onCancel={() => setEditingConversionId(null)}
                          saving={savingConversionId === m.id}
                        />
                      ) : editingRawMaterialId === m.rawMaterialId ? (
                        <RawMaterialForm
                          key={m.id}
                          draft={editRawMaterial}
                          onChange={(patch) => setEditRawMaterial((prev) => ({ ...prev, ...patch }))}
                          onSave={() => handleSaveEditRawMaterial(m.rawMaterialId)}
                          onCancel={() => setEditingRawMaterialId(null)}
                          saving={savingRawMaterialId === m.rawMaterialId}
                        />
                      ) : (
                      <div
                        key={m.id}
                        id={`raw-material-conversion-${m.id}`}
                        className="rounded-xl border border-[#e0662e] bg-white p-5.5 transition-colors"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-1 flex-wrap gap-5">
                          {m.photoPath ? (
                            <a href={fileHref(m.photoPath)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fileHref(m.photoPath)}
                                alt={m.jenis || "Bahan baku"}
                                className="aspect-square w-27.5 rounded-lg border border-[#e8dccd] object-cover"
                              />
                            </a>
                          ) : (
                            <div className="flex aspect-square w-27.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#c8dbc9] text-center text-[9.5px] text-[#5a7a63]">
                              Belum ada foto
                            </div>
                          )}
                          <div className="flex flex-1 flex-wrap gap-x-8 gap-y-3">
                            <div className="min-w-40">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Jenis Bahan Baku</div>
                              <div className="text-[19px] font-extrabold text-[#e0662e]">{m.jenis || "—"}</div>
                            </div>
                            <div className="min-w-35">
                              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">HS Code</div>
                              <div className="font-mono text-[19px] font-extrabold text-[#20180f]">{m.hsCode || "—"}</div>
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                startEditRawMaterial(m.rawMaterialId, {
                                  jenis: m.jenis,
                                  hsCode: m.hsCode,
                                  hsDesc: m.hsDesc,
                                  deskripsi: m.deskripsi,
                                  photoPath: m.photoPath,
                                })
                              }
                              className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813]"
                            >
                              <MaterialIcon name="edit" className="text-[13px]" />
                              Edit Bahan Baku
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                startEditConversion(m.id, {
                                  rawMaterialId: m.rawMaterialId,
                                  kategori: m.kategori,
                                  volumeProduksiJumlah: m.volumeProduksiJumlah,
                                  volumeProduksiSatuan: m.volumeProduksiSatuan,
                                  volumeKebutuhanJumlah: m.volumeKebutuhanJumlah,
                                  volumeKebutuhanSatuan: m.volumeKebutuhanSatuan,
                                  rasioKonversi: m.rasioKonversi,
                                  keterangan: m.keterangan,
                                })
                              }
                              className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813]"
                            >
                              <MaterialIcon name="sync_alt" className="text-[13px]" />
                              Edit Rasio
                            </button>
                            <button
                              type="button"
                              disabled={duplicatingConversionId === m.id}
                              onClick={() =>
                                handleDuplicateConversion(row.id, m.id, {
                                  jenis: m.jenis,
                                  hsCode: m.hsCode,
                                  hsDesc: m.hsDesc,
                                  deskripsi: m.deskripsi,
                                  photoPath: m.photoPath,
                                  kategori: m.kategori,
                                  volumeProduksiJumlah: m.volumeProduksiJumlah,
                                  volumeProduksiSatuan: m.volumeProduksiSatuan,
                                  volumeKebutuhanJumlah: m.volumeKebutuhanJumlah,
                                  volumeKebutuhanSatuan: m.volumeKebutuhanSatuan,
                                  rasioKonversi: m.rasioKonversi,
                                  keterangan: m.keterangan,
                                })
                              }
                              className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#261813] disabled:opacity-50"
                            >
                              <MaterialIcon name="content_copy" className="text-[13px]" />
                              Duplikat
                            </button>
                            <button
                              type="button"
                              disabled={savingConversionId === m.id}
                              onClick={() => handleDeleteConversion(m.id)}
                              className="flex items-center gap-1 rounded-lg border border-[#dc2626] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#dc2626] disabled:opacity-50"
                            >
                              <MaterialIcon name="link_off" className="text-[13px]" />
                              Lepas Tautan
                            </button>
                            <button
                              type="button"
                              disabled={deletingRawMaterialId === m.rawMaterialId}
                              onClick={() => {
                                if (!window.confirm(`Hapus bahan baku "${m.jenis || "ini"}" dari seluruh aplikasi?`)) return;
                                handleDeleteRawMaterial(m.rawMaterialId);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-[#dc2626] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#dc2626] disabled:opacity-50"
                            >
                              <MaterialIcon name="delete" className="text-[13px]" />
                              Hapus Bahan Baku
                            </button>
                          </div>
                        )}
                        </div>

                        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi Bahan Baku</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {m.deskripsi || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Deskripsi HS Code</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {m.hsDesc || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3.5 grid grid-cols-1 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                          <div>
                            <span className="text-[#8a7565]">Rasio Konversi ke Produk</span>
                            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#4a4038]">
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {m.volumeKebutuhanJumlah || "—"} {m.volumeKebutuhanSatuan}
                              </span>
                              <MaterialIcon name="arrow_forward" className="text-[15px] text-[#8a7565]" />
                              <span className="rounded bg-[#fbf8f4] px-2 py-1 font-semibold">
                                {m.volumeProduksiJumlah || "—"} {m.volumeProduksiSatuan}
                              </span>
                            </div>
                          </div>
                          {m.kategori && (
                            <div>
                              <span className="text-[#8a7565]">Kategori</span>
                              <div className="font-bold text-[#20180f]">
                                {RAW_MATERIAL_CONVERSION_KATEGORI_LABELS[m.kategori] ?? m.kategori}
                              </div>
                            </div>
                          )}
                        </div>
                        {m.keterangan && (
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Keterangan</div>
                            <div className="min-h-16 rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3 py-2.5 text-[12px] leading-relaxed text-[#4a4038]">
                              {m.keterangan}
                            </div>
                          </div>
                        )}
                      </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
