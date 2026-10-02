"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { NativeSelect } from "@/components/form/native-select";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useHsCodeOptions } from "../../../../hooks/use-hs-code-options";
import {
  createEmptyKonsumsiProduct,
  KONSUMSI_PRODUCT_CURRENCIES,
  konsumsiProductTotal,
  type ApplicationKonsumsiProductValues,
} from "../../schema";

type Props = {
  brandId: string;
  brandName: string;
  industryGroupId: string;
  industryName: string;
  commodityGroupId: string;
  commodityName: string;
  initialValues?: ApplicationKonsumsiProductValues;
  existingProducts: ApplicationKonsumsiProductValues[];
  excludeIndex?: number;
  onSave: (values: ApplicationKonsumsiProductValues) => void;
  onClose: () => void;
};

type FieldErrors = Partial<Record<"productName" | "hsCode" | "countryOfOrigin" | "quantity" | "stockQuantity" | "averageUnitPrice" | "duplicate", string>>;

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Add/Edit Product — a right-side Sheet rather than a centered Dialog (a form this long reads
 * better sliding in from the edge). Brand and Kelompok Komoditas / Sub Kelompok Komoditas are
 * fixed, read-only context (never silently re-parented — delete + re-add elsewhere if a product
 * genuinely belongs under a different Brand/group). HS Code and Country of Origin are master-
 * data-backed selections, never free text — Uraian HS Code and Satuan are derived read-only
 * displays from the selected HS Code, never independently editable. Total Harga is always derived
 * (Jumlah x Harga Satuan Rata-rata), recalculated server-side at submit — this sheet never lets
 * the user type a total directly.
 */
export function ProductFormSheet({
  brandId,
  brandName,
  industryGroupId,
  industryName,
  commodityGroupId,
  commodityName,
  initialValues,
  existingProducts,
  excludeIndex,
  onSave,
  onClose,
}: Props) {
  const hsCodeOptions = useHsCodeOptions();
  const { options: countryOptions } = useActiveCountries();
  const [form, setForm] = useState<ApplicationKonsumsiProductValues>(
    initialValues ?? createEmptyKonsumsiProduct(brandId, { brandId, industryGroupId, industryName, commodityGroupId, commodityName }),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  function update(patch: Partial<ApplicationKonsumsiProductValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleHsCodeChange(value: string) {
    const option = hsCodeOptions.find((o) => o.value === value);
    update({ hsCode: value, hsDescription: option?.hint ?? "", unit: option?.unit ?? "" });
    setErrors((e) => ({ ...e, hsCode: undefined }));
  }

  function handleCountryChange(value: string) {
    const option = countryOptions.find((o) => o.value === value);
    update({ countryOfOrigin: value, countryOfOriginCode: option?.hint ?? "" });
    setErrors((e) => ({ ...e, countryOfOrigin: undefined }));
  }

  function handleSubmit() {
    const nextErrors: FieldErrors = {};
    if (!form.productName.trim()) nextErrors.productName = "Nama produk wajib diisi.";
    if (!form.hsCode) nextErrors.hsCode = "HS Code wajib dipilih.";
    if (!form.countryOfOrigin) nextErrors.countryOfOrigin = "Negara asal wajib dipilih.";
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.quantity = "Jumlah permohonan harus lebih besar dari 0.";
    const stockQuantity = Number(form.stockQuantity ?? "0");
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) nextErrors.stockQuantity = "Jumlah stock tidak valid.";
    const price = Number(form.averageUnitPrice);
    if (form.averageUnitPrice.trim() === "" || !Number.isFinite(price) || price < 0) {
      nextErrors.averageUnitPrice = "Harga satuan rata-rata tidak valid.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const isDuplicate = existingProducts.some(
      (product, index) =>
        index !== excludeIndex &&
        product.brandId === form.brandId &&
        product.commodityGroupId === form.commodityGroupId &&
        product.hsCode.trim().toLowerCase() === form.hsCode.trim().toLowerCase() &&
        product.countryOfOrigin.trim().toLowerCase() === form.countryOfOrigin.trim().toLowerCase() &&
        product.productName.trim().toLowerCase() === form.productName.trim().toLowerCase(),
    );
    if (isDuplicate) {
      setErrors({ duplicate: "Produk dengan HS Code dan negara asal yang sama sudah terdapat pada kelompok ini." });
      return;
    }

    setErrors({});
    onSave(form);
  }

  const total = konsumsiProductTotal(form);

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initialValues ? "Edit Produk" : "Tambah Produk"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Merek</p>
              <p className="font-semibold">{brandName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kelompok Komoditas</p>
              <p className="font-semibold">{industryName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Sub Kelompok Komoditas</p>
              <p className="font-semibold">{commodityName}</p>
            </div>
          </div>

          <FormField label="Nama Produk" required error={errors.productName}>
            <Input
              placeholder="e.g. Men's Cotton T-Shirt"
              value={form.productName}
              onChange={(event) => {
                update({ productName: event.target.value });
                setErrors((e) => ({ ...e, productName: undefined, duplicate: undefined }));
              }}
            />
          </FormField>

          <FormField label="HS Code" required hint="Cari berdasarkan nomor atau uraian HS Code." error={errors.hsCode}>
            <SearchSelectInput
              value={form.hsCode}
              onChange={handleHsCodeChange}
              options={hsCodeOptions}
              allowFreeText={false}
              placeholder="Cari HS Code..."
            />
          </FormField>

          <FormField label="Uraian HS Code" hint="Otomatis dari HS Code terpilih.">
            <Input value={form.hsDescription ?? ""} readOnly disabled />
          </FormField>

          <FormField label="Asal Negara" required error={errors.countryOfOrigin}>
            <SearchSelectInput
              value={form.countryOfOrigin}
              onChange={handleCountryChange}
              options={countryOptions}
              allowFreeText={false}
              placeholder="Cari negara..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Jumlah Permohonan" required error={errors.quantity}>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(event) => {
                  update({ quantity: event.target.value });
                  setErrors((e) => ({ ...e, quantity: undefined }));
                }}
              />
            </FormField>
            <FormField label="Satuan" hint="Mengikuti HS Code terpilih.">
              <Input value={form.unit ?? ""} readOnly disabled />
            </FormField>
          </div>

          <FormField label="Jumlah Stock" hint="Stock yang saat ini dimiliki perusahaan, terpisah dari Jumlah Permohonan." error={errors.stockQuantity}>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.stockQuantity ?? "0"}
              onChange={(event) => {
                update({ stockQuantity: event.target.value });
                setErrors((e) => ({ ...e, stockQuantity: undefined }));
              }}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Harga Satuan Rata-rata" required error={errors.averageUnitPrice}>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.averageUnitPrice}
                onChange={(event) => {
                  update({ averageUnitPrice: event.target.value });
                  setErrors((e) => ({ ...e, averageUnitPrice: undefined }));
                }}
              />
            </FormField>
            <FormField label="Mata Uang" required>
              <NativeSelect
                value={form.currency}
                onChange={(event) => update({ currency: event.target.value as ApplicationKonsumsiProductValues["currency"] })}
              >
                {KONSUMSI_PRODUCT_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <FormField label="Total Harga">
            <div className="flex items-baseline justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Dihitung otomatis</span>
              <span className="text-base font-bold">{form.currency} {formatMoney(total)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Total harga dihitung otomatis berdasarkan jumlah dan harga satuan rata-rata.
            </p>
          </FormField>

          {errors.duplicate && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              {errors.duplicate}
            </p>
          )}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {initialValues ? "Simpan Perubahan" : "Simpan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
