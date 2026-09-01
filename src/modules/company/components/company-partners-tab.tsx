"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { PARTNER_TYPE_LABELS, PARTNER_STATUS_LABELS, type PartnerType, type PartnerStatus } from "@/modules/partner/schema";

type PartnerListItem = {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  contractNumber: string;
  contractEndDate: string;
  company: { companyName: string; apiType: string | null };
  isOwner: boolean;
};

const STATUS_STYLE: Record<PartnerStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e2f7ea", color: "#1a7a4c" },
  INACTIVE: { bg: "#f2ece5", color: "#6b5b4c" },
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Admin's read-only view of this company's "Partner Companies" — same OR-scoping as Company
 * Workspace's own list (registered by this company, or admin-related to it via "PERUSAHAAN API-U
 * TERKAIT"), fetched from `/api/companies/[id]/partners`. Links out to admin's own Partner
 * Management (`/partners/[id]`) for the actual detail/edit — no manage actions live here.
 */
export function CompanyPartnersTab({ companyId }: { companyId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", "detail", "partners", companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/partners`);
      if (!response.ok) throw new Error("Gagal memuat data partner");
      const json = (await response.json()) as { data: PartnerListItem[] };
      return json.data;
    },
  });

  return (
    <div className="rounded-xl border border-[#efe2d4] bg-white p-7">
      <div className="mb-1 text-[13px] font-bold text-[#20180f]">Partner Companies</div>
      <p className="mb-5 text-[12.5px] text-[#8a7565]">
        Mitra industri/non-industri yang didaftarkan sendiri oleh perusahaan ini, atau dikaitkan oleh admin sebagai
        &quot;Perusahaan API-U Terkait&quot;.
      </p>

      {isLoading && <p className="text-[12.5px] text-[#8a7565]">Memuat...</p>}
      {isError && <p className="text-[12.5px] text-[#c1361f]">Gagal memuat data partner.</p>}
      {!isLoading && !isError && data?.length === 0 && (
        <p className="text-[12.5px] text-[#8a7565]">Belum ada partner yang terhubung dengan perusahaan ini.</p>
      )}

      {data && data.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {data.map((partner) => {
            const style = STATUS_STYLE[partner.status];
            return (
              <Link
                key={partner.id}
                href={`/partners/${partner.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#f0ded0] p-3.5 hover:bg-[#fdf9f5]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-[#20180f]">{partner.company.companyName}</div>
                  <div className="mt-0.5 text-[11.5px] text-[#8a7565]">
                    {PARTNER_TYPE_LABELS[partner.type]} · Kontrak {partner.contractNumber} · Berakhir {fmtDate(partner.contractEndDate)}
                    {!partner.isOwner && " · Dikaitkan oleh Admin"}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: style.bg, color: style.color }}
                >
                  {PARTNER_STATUS_LABELS[partner.status]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
