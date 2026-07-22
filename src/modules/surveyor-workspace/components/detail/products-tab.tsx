import { MaterialIcon } from "../material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type Props = { payload: ApplicationWizardValues };

export function ProductsTab({ payload }: Props) {
  const products = payload.products ?? [];

  return (
    <div className="overflow-x-auto rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
      <div className="mb-1 flex items-center gap-3.5">
        <MaterialIcon name="inventory_2" className="text-sv-primary-container" />
        <h3 className="font-sv-headline-lg text-[19px] font-bold">Product Information</h3>
      </div>
      <div className="mb-6 text-sm text-[#8a7565]">Daftar produk yang diajukan dalam permohonan</div>

      {products.length === 0 ? (
        <p className="text-sm text-[#8a7565]">Belum ada produk yang tercatat.</p>
      ) : (
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[1fr_1.2fr_1.8fr_1.2fr] gap-3 border-b border-[#f0ded0] px-1 pb-3 text-[11.5px] uppercase tracking-wide text-[#a68f80]">
            <div>HS Code</div>
            <div>Material</div>
            <div>Tujuan Penggunaan</div>
            <div>Estimasi Volume</div>
          </div>
          {products.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-[1fr_1.2fr_1.8fr_1.2fr] items-center gap-3 border-b border-[#f5ebe1] px-1 py-4 text-sm"
            >
              <div className="font-semibold">{product.hsCode}</div>
              <div>{product.materialType}</div>
              <div className="text-[#594138]">{product.intendedUse}</div>
              <div>
                {product.estimatedVolume} {product.volumeUnit}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
