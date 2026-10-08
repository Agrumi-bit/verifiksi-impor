import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MaterialIcon } from "@/modules/project-manager-workspace/components/material-icon";
import { viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";
import { Pasal47Module } from "@/modules/project-manager-workspace/pasal47/components/pasal47-module";

type Params = { params: Promise<{ scheme: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const scheme = viuSchemeFromSlug((await params).scheme);
  return { title: `Laporan Kemenperin ${scheme?.label ?? "VIU"} — Project Manager Workspace` };
}

export default async function ProjectManagerViuSchemeKemenperinPage({ params }: Params) {
  const scheme = viuSchemeFromSlug((await params).scheme);
  if (!scheme) notFound();
  // Pelaporan Pasal 47 covers VIU Produk Tekstil sebagai Barang Konsumsi; the other schemes keep the placeholder.
  if (scheme.slug === "konsumsi") {
    return (
      <div className="p-8">
        <Pasal47Module />
      </div>
    );
  }
  return (
    <div className="p-8">
      <div className="mb-5.5">
        <div className="text-[22px] font-extrabold">Laporan Kemenperin {scheme.label}</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Laporan {scheme.label} untuk disampaikan kepada Kementerian Perindustrian.</div>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-[#e1bfb3] bg-white p-12 text-center">
        <MaterialIcon name="account_balance" className="text-[32px] text-[#c9b3a3]" />
        <div className="text-[14px] font-bold text-[#4a4038]">Isi Laporan Kemenperin belum ditentukan</div>
        <div className="max-w-md text-[12.5px] text-[#a68f80]">Menu ini sudah disiapkan untuk {scheme.label}. Isi dan format laporannya akan ditambahkan setelah ditentukan.</div>
      </div>
    </div>
  );
}
