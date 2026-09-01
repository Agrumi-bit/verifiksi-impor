"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { CompanyProfileTabsContent } from "@/modules/company-workspace/components/profile-tabs";
import type { CompanyProfileData } from "@/modules/company-workspace/components/profile-tabs";
import { CompanyPartnersTab } from "./company-partners-tab";

type Props = { id: string };

/**
 * Admin's Company Detail — same 5-tab layout (Informasi Umum/Contact/Dokumen Legal/Dokumen
 * Pajak/Fasilitas) and the same edit flow as Company Workspace's own Company Profile, reusing
 * `CompanyProfileTabsContent` directly instead of a parallel admin-only layout. Points it at
 * `/api/companies/[id]/profile` (admin-gated, keyed by the URL id) instead of Company
 * Workspace's own session-scoped route. Document version history stays off — that feature reads/
 * writes through a route scoped to the caller's own `session.user.companyId`, meaningless for
 * admin browsing an arbitrary company.
 */
export function CompanyDetail({ id }: Props) {
  const basePath = `/api/companies/${id}/profile`;
  const queryKey = ["companies", "detail", "profile", id];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(basePath);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Perusahaan tidak ditemukan");
      }
      const json = (await response.json()) as { data: CompanyProfileData };
      return json.data;
    },
  });

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4.5 flex items-center gap-2.5">
          <Link
            href="/company"
            aria-label="Kembali ke daftar perusahaan"
            className="flex size-8 items-center justify-center rounded-lg text-[#a68f80] outline-none transition-colors duration-150 hover:bg-[#f2f0ee] hover:text-[#594138] focus-visible:ring-2 focus-visible:ring-[#e0662e]"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="text-[20px] font-extrabold text-[#2b2420]">Detail Perusahaan</div>
        </div>

        {isLoading && <p className="p-7 text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError || (!isLoading && !data) ? (
          <p className="p-7 text-[13px] text-[#ba1a1a]">Data perusahaan tidak ditemukan.</p>
        ) : null}
        {data && (
          <CompanyProfileTabsContent
            data={data}
            basePath={basePath}
            queryKey={queryKey}
            allowDocumentHistory={false}
            extraTab={{ label: "Partner", content: <CompanyPartnersTab companyId={id} /> }}
          />
        )}
      </div>
    </div>
  );
}
