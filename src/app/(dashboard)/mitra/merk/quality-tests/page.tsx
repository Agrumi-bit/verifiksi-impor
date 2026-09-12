import type { Metadata } from "next";

import { QualityTestsTable } from "@/modules/merk/components/management/quality-tests-table";

export const metadata: Metadata = {
  title: "Hasil Uji Mutu — Verifikasi Impor",
};

export default function MerkQualityTestsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Hasil Uji Mutu</h1>
        <p className="text-sm text-muted-foreground">
          Monitoring hasil uji mutu merek pada seluruh platform.
        </p>
      </div>
      <QualityTestsTable fetchUrl="/api/merk/quality-tests" brandDetailHrefBase="/mitra/merk" />
    </div>
  );
}
