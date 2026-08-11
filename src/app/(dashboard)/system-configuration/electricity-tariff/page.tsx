import type { Metadata } from "next";

import { ElectricityTariffPage } from "@/modules/master-data/components/electricity-tariff-page";

export const metadata: Metadata = {
  title: "Golongan Tarif Listrik — Verifikasi Impor",
};

export default function Page() {
  return <ElectricityTariffPage />;
}
