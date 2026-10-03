"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { NativeSelect } from "@/components/form/native-select";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useHsCodeOptions } from "../../../../hooks/use-hs-code-options";
import {
  createEmptyKonsumsiProduct,
  KONSUMSI_PRODUCT_CURRENCIES,
  konsumsiProductTotal,
  type ApplicationKonsumsiProductValues,
} from "../../schema";
import { CountryMultiSelect, useActiveCountriesByCode } from "./country-multi-select";

type Props = {
  brandId: string;
  brandName: string;
  initialValues?: ApplicationKonsumsiProductValues;
  existingProducts: ApplicationKonsumsiProductValues[];
  excludeIndex?: number;
  onSave: (values: ApplicationKonsumsiProductValues) => void;
  onClose: () => void;
};

type FieldErrors = Partial<Record<"productName" | "hsCode" | "originCountries" | "quantity" | "stockQuantity" | "averageUnitPrice" | "duplicate", string>>;

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Add/Edit Product — a right-side Sheet rather than a centered Dialog (a form this long reads
 * better sliding in from the edge). Only Brand is fixed context (set by whichever
 * BrandProductSection opened this sheet) — HS Code is the PRIMARY driver here: picking one
 * auto-fills Komoditas/Sub Kelompok Komoditas/Kelompok Komoditas/Uraian/Satuan in one step (see
 * `handleHsCodeChange`), all shown read-only. This is the inverse of this sheet's previous design
 * (Kelompok/Sub Kelompok fixed context, HS Code picked within it) — see the Step 7/9 refactor: a
 * product's commodity group is now a *consequence* of its HS Code, not a precondition. Country of
 * Origin is likewise a master-data-backed selection, never free text. Total Harga is always
 * derived (Jumlah x Harga Satuan Rata-rata), recalculated server-side at submit — this sheet never
 * lets the user type a total directly.
 */
export function ProductFormSheet({
  brandId,
  brandName,
  initialValues,
  existingProducts,
  excludeIndex,
  onSave,
  onClose,
}: Props) {
  const hsCodeOptions = useHsCodeOptions();
  const countries = useActiveCountriesByCode();
  const [form, setForm] = useState<ApplicationKonsumsiProductValues>(
    initialValues ?? createEmptyKonsumsiProduct(brandId),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  function update(patch: Partial<ApplicationKonsumsiProductValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleHsCodeChange(value: string) {
    const option = hsCodeOptions.find((o) => o.value === value);
    if (!option) return;
    update({
      hsCode: option.value,
      hsCodeId: option.hsCodeId,
      hsDescription: option.hint,
      unit: option.unit,
      commoditySubGroupId: option.commoditySubGroupId,
      commoditySubGroupName: option.commoditySubGroupName,
      commodityGroupId: option.commodityGroupId,
      commodityName: option.commodityGroupName,
      industryGroupId: option.industryGroupId ?? "",
      industryName: option.industryGroupName ?? "",
    });
    setErrors((e) => ({ ...e, hsCode: undefined }));
  }

  function handleCountriesChange(next: string[]) {
    update({ originCountries: next, originCountryNames: next.map((code) => countries.find((c) => c.code === code)?.name ?? code) });
    setErrors((e) => ({ ...e, originCountries: undefined }));
  }

  function handleSubmit() {
    const nextErrors: FieldErrors = {};
    if (!form.productName.trim()) nextErrors.productName = "Nama produk wajib diisi.";
    if (!form.hsCodeId) nextErrors.hsCode = "HS Code wajib dipilih.";
    if (form.originCountries.length === 0) nextErrors.originCountries = "Pilih minimal satu negara asal.";
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

    const formCountryKey = [...form.originCountries].map((c) => c.trim().toLowerCase()).sort().join(",");
    const isDuplicate = existingProducts.some(
      (product, index) =>
        index !== excludeIndex &&
        product.brandId === form.brandId &&
        product.hsCodeId === form.hsCodeId &&
        [...product.originCountries].map((c) => c.trim().toLowerCase()).sort().join(",") === formCountryKey &&
        product.productName.trim().toLowerCase() === form.productName.trim().toLowerCase(),
    );
    if (isDuplicate) {
      setErrors({ duplicate: "Produk dengan HS Code, negara asal, dan nama yang sama sudah ada untuk merek ini." });
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
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Merek</p>
            <p className="font-semibold">{brandName}</p>
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

          {form.hsCodeId && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Uraian HS Code</p>
                <p className="font-medium">{form.hsDescription || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kelompok Komoditas</p>
                <p className="font-medium">{form.industryName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sub Kelompok Komoditas</p>
                <p className="font-medium">{form.commodityName || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Komoditas</p>
                <p className="font-medium">{form.commoditySubGroupName || "—"}</p>
              </div>
            </div>
          )}

          <FormField label="Asal Negara" required error={errors.originCountries}>
            <CountryMultiSelect value={form.originCountries} onChange={handleCountriesChange} />
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
