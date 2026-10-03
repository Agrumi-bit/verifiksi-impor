"use client";

import { useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown, Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useHsCodeOptions } from "../../../../hooks/use-hs-code-options";
import type { ApplicationWizardValues } from "../../../../schema";
import {
  createEmptyKonsumsiProduct,
  deriveProductGroups,
  konsumsiProductTotal,
  KONSUMSI_PRODUCT_CURRENCIES,
  type ApplicationKonsumsiProductValues,
} from "../../schema";
import { downloadProductExcelTemplate, parseProductExcelFile } from "./product-excel";
import { CommodityProductSection } from "./commodity-product-section";
import { ProductFormSheet } from "./product-form-sheet";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  brandId: string;
  brandName: string;
  brandOwnerTitle: string | null;
};

/**
 * One Brand's section — collapsible (click the header), since a permohonan with several Brands
 * each carrying several commodity groups can get long. Kelompok Komoditas / Sub Kelompok
 * Komoditas groupings are derived bottom-up from this Brand's own Products' HS Code picks (see
 * `deriveProductGroups` — the inverse of this section's previous design, where groups came
 * pre-established from Step "Dokumen Pendukung Merek" before any product existed). Does not
 * duplicate Brand Master editing — owner info is display-only, read from the same Brand options
 * the "Merek yang Digunakan" step already resolves.
 */
export function BrandProductSection({ form, brandId, brandName, brandOwnerTitle }: Props) {
  const { control } = form;
  const allProducts = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const [collapsed, setCollapsed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hsCodeOptions = useHsCodeOptions();
  const { options: countryOptions } = useActiveCountries();

  const brandProducts = allProducts.filter((product) => product.brandId === brandId);
  const brandGroups = deriveProductGroups(brandProducts);

  const totalsByCurrency = new Map<string, number>();
  for (const product of brandProducts) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  function handleAddProduct(values: ApplicationKonsumsiProductValues) {
    const current = form.getValues("konsumsiProducts") ?? [];
    form.setValue("konsumsiProducts", [...current, values], { shouldDirty: true });
    setIsAddingProduct(false);
  }

  function handleDownloadTemplate() {
    downloadProductExcelTemplate(brandName);
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { rows, skippedRows } = await parseProductExcelFile(file);
      if (rows.length === 0) {
        toast.error('Tidak ada baris valid ditemukan. Pastikan semua kolom wajib terisi.');
        return;
      }

      const currentProducts = form.getValues("konsumsiProducts") ?? [];
      const newProducts: ApplicationKonsumsiProductValues[] = [];
      const errors: string[] = [];
      let duplicateCount = 0;

      rows.forEach((row, rowIndex) => {
        const rowLabel = `Baris ${rowIndex + 2}`;
        const hsOption = hsCodeOptions.find((o) => o.value.trim().toLowerCase() === row.hsCode.trim().toLowerCase());
        if (!hsOption) {
          errors.push(`${rowLabel}: HS Code "${row.hsCode}" tidak ditemukan atau tidak aktif.`);
          return;
        }

        const countryOption = countryOptions.find((o) => o.value.trim().toLowerCase() === row.countryOfOrigin.trim().toLowerCase());
        if (!countryOption) {
          errors.push(`${rowLabel}: Negara asal "${row.countryOfOrigin}" tidak ditemukan.`);
          return;
        }

        const quantity = Number(row.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          errors.push(`${rowLabel}: Jumlah permohonan tidak valid.`);
          return;
        }

        const stockQuantity = Number(row.stockQuantity);
        if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
          errors.push(`${rowLabel}: Jumlah stock tidak valid.`);
          return;
        }

        const price = Number(row.averageUnitPrice);
        if (!Number.isFinite(price) || price < 0) {
          errors.push(`${rowLabel}: Harga satuan rata-rata tidak valid.`);
          return;
        }

        if (!(KONSUMSI_PRODUCT_CURRENCIES as readonly string[]).includes(row.currency)) {
          errors.push(`${rowLabel}: Mata uang "${row.currency}" tidak dikenali.`);
          return;
        }

        const isDuplicate = [...currentProducts, ...newProducts].some(
          (product) =>
            product.brandId === brandId &&
            product.hsCodeId === hsOption.hsCodeId &&
            product.countryOfOrigin.trim().toLowerCase() === countryOption.value.trim().toLowerCase() &&
            product.productName.trim().toLowerCase() === row.productName.trim().toLowerCase(),
        );
        if (isDuplicate) {
          duplicateCount += 1;
          return;
        }

        newProducts.push({
          ...createEmptyKonsumsiProduct(brandId),
          productName: row.productName,
          hsCode: hsOption.value,
          hsCodeId: hsOption.hsCodeId,
          hsDescription: hsOption.hint ?? "",
          unit: hsOption.unit ?? "",
          commoditySubGroupId: hsOption.commoditySubGroupId,
          commoditySubGroupName: hsOption.commoditySubGroupName,
          commodityGroupId: hsOption.commodityGroupId,
          commodityName: hsOption.commodityGroupName,
          industryGroupId: hsOption.industryGroupId ?? "",
          industryName: hsOption.industryGroupName ?? "",
          countryOfOrigin: countryOption.value,
          countryOfOriginCode: countryOption.hint ?? "",
          quantity: row.quantity,
          stockQuantity: row.stockQuantity,
          averageUnitPrice: row.averageUnitPrice,
          currency: row.currency as ApplicationKonsumsiProductValues["currency"],
        });
      });

      if (newProducts.length > 0) {
        form.setValue("konsumsiProducts", [...currentProducts, ...newProducts], { shouldDirty: true });
      }

      const notes: string[] = [];
      if (duplicateCount > 0) notes.push(`${duplicateCount} duplikat dilewati`);
      if (skippedRows > 0) notes.push(`${skippedRows} baris kosong dilewati`);
      if (errors.length > 0) notes.push(`${errors.length} baris gagal: ${errors.slice(0, 3).join(" ")}${errors.length > 3 ? " ..." : ""}`);

      if (newProducts.length > 0) {
        toast.success(`${newProducts.length} produk berhasil diimpor.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      } else {
        toast.error(`Tidak ada produk baru diimpor.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      }
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <div className="flex w-full flex-wrap items-center gap-3 p-4.5 hover:bg-muted/30">
        <div
          className="flex flex-1 cursor-pointer items-center gap-3"
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed((c) => !c)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setCollapsed((c) => !c);
          }}
          aria-expanded={!collapsed}
        >
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          <div>
            <p className="text-sm font-bold">{brandName}</p>
            {brandOwnerTitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">Pemilik Merek: {brandOwnerTitle}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {brandGroups.length} Sub Kelompok Komoditas &middot; {brandProducts.length} Produk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="size-3.5" />
            Template
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-3.5" />
            {isImporting ? "Mengimpor..." : "Impor Excel"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <Button type="button" size="sm" onClick={() => setIsAddingProduct(true)}>
            <Plus className="size-3.5" />
            Tambah Produk
          </Button>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Nilai</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 border-t border-border p-4.5">
          {brandGroups.map((group) => (
            <CommodityProductSection
              key={group.commodityGroupId}
              form={form}
              brandId={brandId}
              brandName={brandName}
              industryName={group.industryName ?? ""}
              commodityGroupId={group.commodityGroupId}
              commodityName={group.commodityName ?? "Sub Kelompok Komoditas"}
            />
          ))}

          {brandGroups.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Belum ada produk untuk merek ini. Tambahkan produk pertama — Sub Kelompok
                Komoditasnya akan ditentukan otomatis dari HS Code yang dipilih.
              </p>
            </div>
          )}
        </div>
      )}

      {isAddingProduct && (
        <ProductFormSheet
          brandId={brandId}
          brandName={brandName}
          existingProducts={allProducts}
          onSave={handleAddProduct}
          onClose={() => setIsAddingProduct(false)}
        />
      )}
    </section>
  );
}
