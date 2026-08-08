"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { PARTNER_TYPE_LABELS, PARTNER_STATUS_LABELS, type PartnerType, type PartnerStatus } from "../schema";

type PartnerDetailData = {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  contractDocumentPath: string | null;
  company: {
    companyName: string;
    companyType: string;
    apiType: string | null;
    nibNumber: string;
    npwpNumber: string;
    skNumber: string;
  };
};

const STATUS_BADGE: Record<PartnerStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e2f7ea", color: "#1a7a4c" },
  INACTIVE: { bg: "#fce8e6", color: "#ba1a1a" },
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] text-[#8a7565]">{label}</div>
      <div className="text-[13.5px] font-semibold text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

type Props = {
  id: string;
};

export function PartnerDetail({ id }: Props) {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partners", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/partners/${id}`);
      if (!response.ok) throw new Error("Partner tidak ditemukan");
      const json = (await response.json()) as { data: PartnerDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#fbeee5] p-7">
        <p className="text-[13px] text-[#8a7565]">Memuat...</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-full bg-[#fbeee5] p-7">
        <p className="text-[13px] text-[#ba1a1a]">Data partner tidak ditemukan atau database belum terhubung.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-190">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/partners")}
              className="text-[20px] text-[#a68f80]"
            >
              ←
            </button>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
                {PARTNER_TYPE_LABELS[data.type]}
              </div>
              <div className="text-[20px] font-extrabold text-[#2b2420]">{data.company.companyName}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/partners")}
            className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813]"
          >
            Kembali ke Daftar
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[14px] border border-[#f0ded0] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-[#20180f]">Perusahaan</h2>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{ background: STATUS_BADGE[data.status].bg, color: STATUS_BADGE[data.status].color }}
              >
                {PARTNER_STATUS_LABELS[data.status]}
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailItem label="Tipe Perusahaan" value={data.company.companyType} />
              <DetailItem label="Jenis API" value={data.company.apiType} />
              <DetailItem label="NIB" value={data.company.nibNumber} />
              <DetailItem label="NPWP" value={data.company.npwpNumber} />
              <DetailItem label="SK Kemenkumham" value={data.company.skNumber} />
            </div>
          </section>

          <section className="rounded-[14px] border border-[#f0ded0] bg-white p-6">
            <h2 className="mb-4 text-[15px] font-extrabold text-[#20180f]">Kontrak Kerja Sama</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailItem label="Nomor Kontrak" value={data.contractNumber} />
              <DetailItem label="Tanggal Mulai" value={new Date(data.contractStartDate).toLocaleDateString("id-ID")} />
              <DetailItem label="Tanggal Berakhir" value={new Date(data.contractEndDate).toLocaleDateString("id-ID")} />
              <DetailItem label="Bukti Kontrak" value={data.contractDocumentPath ? "Terunggah" : "Belum diunggah"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
