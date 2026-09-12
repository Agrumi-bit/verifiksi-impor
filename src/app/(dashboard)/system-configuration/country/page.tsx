import type { Metadata } from "next";

import { CountryMasterData } from "./country-master-data";

export const metadata: Metadata = {
  title: "Data Negara — Verifikasi Impor",
};

export default function CountryMasterDataPage() {
  return <CountryMasterData />;
}
