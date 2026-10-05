import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { konsumsiProductTotal, type ApplicationKonsumsiProductValues } from "../../schema";

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MAX_VISIBLE_COUNTRIES = 3;

function OriginCountriesCell({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-muted-foreground">—</span>;
  const visible = names.slice(0, MAX_VISIBLE_COUNTRIES);
  const hiddenCount = names.length - visible.length;
  return (
    <span title={names.join(", ")}>
      {visible.join(", ")}
      {hiddenCount > 0 ? ` +${hiddenCount}` : ""}
    </span>
  );
}

const COLUMNS = [
  "Nama Produk",
  "HS Code",
  "Uraian HS Code",
  "Asal Negara",
  "Jumlah Permohonan",
  "Satuan",
  "Jumlah Stock",
  "Harga Satuan Rata-rata",
  "Mata Uang",
  "Total Harga",
  "",
];

type Row = { product: ApplicationKonsumsiProductValues; index: number };

/** One row = one Brand + Commodity Group + Product + HS Code + Country of Origin combination —
 * the same commercial product imported from two countries is two valid, separate rows, never
 * merged. */
export function ProductTable({
  rows,
  onEdit,
  onRemove,
}: {
  rows: Row[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-240 text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            {COLUMNS.map((col, i) => (
              <th key={col || `col-${i}`} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ product, index }) => (
            <tr key={product.id} className="border-t border-border">
              <td className="px-3 py-2">
                {product.productName}
                {product.commodityGroupChangedFrom && (
                  <span
                    className="mt-1 block w-fit rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300"
                    title={`Sebelumnya: ${product.commodityGroupChangedFrom}`}
                  >
                    Sub Kelompok diperbarui mengikuti master HS Code (sebelumnya {product.commodityGroupChangedFrom})
                  </span>
                )}
              </td>
              <td className="px-3 py-2 font-mono">{product.hsCode}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{product.hsDescription}</td>
              <td className="px-3 py-2">
                <OriginCountriesCell names={product.originCountryNames ?? product.originCountries ?? []} />
              </td>
              <td className="px-3 py-2">{Number(product.quantity).toLocaleString("id-ID")}</td>
              <td className="px-3 py-2">{product.unit}</td>
              <td className="px-3 py-2">{Number(product.stockQuantity ?? 0).toLocaleString("id-ID")}</td>
              <td className="px-3 py-2">{formatMoney(Number(product.averageUnitPrice))}</td>
              <td className="px-3 py-2">{product.currency}</td>
              <td className="px-3 py-2 font-semibold">
                {product.currency} {formatMoney(konsumsiProductTotal(product))}
              </td>
              <td className="px-3 py-2 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                    aria-label="Menu produk"
                  >
                    <MoreVertical className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(index)}>
                      <Pencil />
                      Edit Produk
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onRemove(index)}>
                      <Trash2 />
                      Hapus Produk
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
