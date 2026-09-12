import type { Metadata } from "next";

import { BrandDraftsTable } from "@/modules/merk/components/management/brand-drafts-table";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Draft Merek — Verifikasi Impor",
};

export default function MerkDraftsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Draft</h1>
        <p className="text-sm text-muted-foreground">
          Merek yang belum diselesaikan pengisiannya melalui Wizard Tambah Merek.
        </p>
      </div>
      <BrandDraftsTable surface={INTERNAL_MERK_SURFACE} fetchUrl="/api/merk/drafts" />
    </div>
  );
}
