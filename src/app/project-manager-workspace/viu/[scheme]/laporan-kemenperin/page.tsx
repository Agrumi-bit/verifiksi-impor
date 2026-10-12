import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";
import { Pasal47Module } from "@/modules/project-manager-workspace/pasal47/components/pasal47-module";
import { IndustriModule } from "@/modules/project-manager-workspace/pasal47/industri/components/industri-module";
import { NonIndustriModule } from "@/modules/project-manager-workspace/pasal47/non-industri/components/non-industri-module";

type Params = { params: Promise<{ scheme: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const scheme = viuSchemeFromSlug((await params).scheme);
  return { title: `Laporan Kemenperin ${scheme?.label ?? "VIU"} — Project Manager Workspace` };
}

export default async function ProjectManagerViuSchemeKemenperinPage({ params }: Params) {
  const scheme = viuSchemeFromSlug((await params).scheme);
  if (!scheme) notFound();
  // Pelaporan Pasal 47 is built for VIU Barang Konsumsi, VIU Bahan Baku Industri and VIU Bahan Baku Non Industri.
  if (scheme.slug === "konsumsi") {
    return (
      <div className="p-8">
        <Pasal47Module />
      </div>
    );
  }
  if (scheme.slug === "industri") {
    return (
      <div className="p-8">
        <IndustriModule />
      </div>
    );
  }
  return (
    <div className="p-8">
      <NonIndustriModule />
    </div>
  );
}
