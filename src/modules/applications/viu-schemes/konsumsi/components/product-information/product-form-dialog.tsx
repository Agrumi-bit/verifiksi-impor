"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { NativeSelect } from "@/components/form/native-select";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useHsCodeOptions } from "../../../../hooks/use-hs-code-options";
import { KONSUMSI_PRODUCT_CURRENCIES, konsumsiProductTotal, type ApplicationKonsumsiProductValues } from "../../schema";

type Props = {
  brandId: string;
  brandName: string;
  commodityGroupId: string;
  commodityName: string;
  initialValues?: ApplicationKonsumsiProductValues;
  existingProducts: ApplicationKonsumsiProductValues[];
  excludeIndex?: number;
  onSave: (values: ApplicationKonsumsiProductValues) => void;
  onClose: () => void;
};

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyProduct(brandId: string, commodityGroupId: string): ApplicationKonsumsiProductValues {
  return {
    id: crypto.randomUUID(),
    brandId,
    commodityGroupId,
    productName: "",
    hsCode: "",
    countryOfOrigin: "",
    quantity: "",
    averageUnitPrice: "",
    currency: "USD",
  };
}

/**
 * Add/Edit Product — Brand and Kelompok Komoditas are fixed, read-only context (never silently
 * re-parented; see this component's own callers for the remove+add-elsewhere alternative when a
 * product genuinely belongs under a different Brand/group). HS Code and Country of Origin are
 * master-data-backed selections, never free text — Uraian HS Code and Satuan are derived
 * read-only displays from the selected HS Code, never independently editable. Total Harga is
 * always derived (Jumlah x Harga Satuan Rata-rata), recalculated server-side at submit — this
 * dialog never lets the user type a total directly.
 */
export function ProductFormDialog({
  brandId,
  brandName,
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
    initialValues ?? emptyProduct(brandId, commodityGroupId),
  );
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<ApplicationKonsumsiProductValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleHsCodeChange(value: string) {
    const option = hsCodeOptions.find((o) => o.value === value);
    update({ hsCode: value, hsDescription: option?.hint ?? "", unit: option?.unit ?? "" });
  }

  function handleCountryChange(value: string) {
    const option = countryOptions.find((o) => o.value === value);
    update({ countryOfOrigin: value, countryOfOriginCode: option?.hint ?? "" });
  }

  function handleSubmit() {
    if (!form.productName.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }
    if (!form.hsCode) {
      setError("HS Code wajib dipilih.");
      return;
    }
    if (!form.countryOfOrigin) {
      setError("Negara asal wajib dipilih.");
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Jumlah harus lebih besar dari 0.");
      return;
    }
    const price = Number(form.averageUnitPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Harga satuan rata-rata tidak valid.");
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
      setError("Produk ini sudah ada untuk kombinasi merek, kelompok komoditas, HS Code, dan negara asal yang sama.");
      return;
    }

    setError(null);
    onSave(form);
  }

  const total = konsumsiProductTotal(form);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Merek</p>
              <p className="font-semibold">{brandName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kelompok Komoditas</p>
              <p className="font-semibold">{commodityName}</p>
            </div>
          </div>

          <FormField label="Nama Produk" required>
            <Input
              placeholder="e.g. Men's Cotton T-Shirt"
              value={form.productName}
              onChange={(event) => update({ productName: event.target.value })}
            />
          </FormField>

          <FormField label="HS Code" required hint="Cari berdasarkan nomor atau uraian HS Code.">
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

          <FormField label="Asal Negara" required>
            <SearchSelectInput
              value={form.countryOfOrigin}
              onChange={handleCountryChange}
              options={countryOptions}
              allowFreeText={false}
              placeholder="Cari negara..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Jumlah" required>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(event) => update({ quantity: event.target.value })}
              />
            </FormField>
            <FormField label="Satuan" hint="Mengikuti HS Code terpilih.">
              <Input value={form.unit ?? ""} readOnly disabled />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Harga Satuan Rata-rata" required>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.averageUnitPrice}
                onChange={(event) => update({ averageUnitPrice: event.target.value })}
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

          <FormField label="Total Harga" hint="Jumlah x Harga Satuan Rata-rata, dihitung otomatis.">
            <Input value={`${form.currency} ${formatMoney(total)}`} readOnly disabled className="font-semibold" />
          </FormField>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
