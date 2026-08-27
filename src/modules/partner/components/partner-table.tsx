"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Factory, Handshake, Trash2, type LucideIcon } from "lucide-react";

import {
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  type PartnerType,
  type PartnerStatus,
} from "../schema";

type PartnerListItem = {
  id: string;
  companyId: string;
  type: PartnerType;
  status: PartnerStatus;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  company: { companyName: string; companyType: string };
  relatedCompanies: { id: string; companyName: string }[];
};

const TABLE_COLUMNS = "1.5fr 1.7fr 0.8fr 1.1fr 0.9fr 0.8fr 0.9fr";

const TYPE_BADGE: Record<PartnerType, { bg: string; color: string }> = {
  INDUSTRI: { bg: "#e6e9fb", color: "#4a4fb0" },
  NON_INDUSTRI: { bg: "#fdeadd", color: "#c14a1f" },
};

const STATUS_BADGE: Record<PartnerStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e2f7ea", color: "#1a7a4c" },
  INACTIVE: { bg: "#fce8e6", color: "#ba1a1a" },
};

export function PartnerTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<"" | PartnerType>("");
  const [status, setStatus] = useState<"" | PartnerStatus>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const response = await fetch("/api/partners");
      if (!response.ok) throw new Error("Gagal memuat data partner");
      const json = (await response.json()) as { data: PartnerListItem[] };
      return json.data;
    },
  });

  const partners = useMemo(() => data ?? [], [data]);

  const activeContractCountByCompany = useMemo(() => {
    const counts = new Map<string, number>();
    for (const partner of partners) {
      if (partner.status !== "ACTIVE") continue;
      counts.set(partner.companyId, (counts.get(partner.companyId) ?? 0) + 1);
    }
    return counts;
  }, [partners]);

  const stats = useMemo(() => {
    const total = partners.length;
    const industri = partners.filter((p) => p.type === "INDUSTRI").length;
    const nonIndustri = partners.filter((p) => p.type === "NON_INDUSTRI").length;
    return [
      { label: "TOTAL PARTNER", value: total, color: "#e0662e", bg: "#fdeadd", icon: Handshake },
      { label: "PARTNER INDUSTRI", value: industri, color: "#4a4fb0", bg: "#e6e9fb", icon: Factory },
      { label: "PARTNER NON INDUSTRI", value: nonIndustri, color: "#1a7a4c", bg: "#e2f7ea", icon: Building2 },
    ] satisfies { label: string; value: number; color: string; bg: string; icon: LucideIcon }[];
  }, [partners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (q && !p.company.companyName.toLowerCase().includes(q)) return false;
      if (jenis && p.type !== jenis) return false;
      if (status && p.status !== status) return false;
      return true;
    });
  }, [partners, search, jenis, status]);

  async function handleRemove(id: string, companyName: string) {
    const response = await fetch(`/api/partners/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Gagal menghapus partner");
      return;
    }
    toast.success(`"${companyName}" dihapus dari Partner.`);
    queryClient.invalidateQueries({ queryKey: ["partners"] });
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">Partner Management</div>
          <p className="mt-1 max-w-140 text-[13px] text-[#8a7565]">
            Kelola Perusahaan Industri dan Non Industri yang menjadi mitra kontrak Perusahaan API-U dalam
            pengajuan VIU. Data diambil langsung dari Company List — tidak ada data ganda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/partners/new")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          + Tambah Partner
        </button>
      </div>

      <div className="mb-5.5 grid grid-cols-3 gap-3.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4"
          >
            <div>
              <div className="text-[11px] font-semibold tracking-[0.03em] text-[#a68f80]">{stat.label}</div>
              <div className="mt-0.5 text-[24px] font-extrabold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
            <div
              className="flex size-9.5 items-center justify-center rounded-lg"
              style={{ background: stat.bg, color: stat.color }}
            >
              <stat.icon className="size-4.75" />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] text-[#594138]">⚗</span>
            <span className="text-[14px] font-bold text-[#2b2420]">Filter Partner</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#261813]"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[#f5ebe1] pt-4">
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Cari Partner</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama perusahaan partner..."
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Jenis Partner</div>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as "" | PartnerType)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Jenis</option>
                {(Object.keys(PARTNER_TYPE_LABELS) as PartnerType[]).map((value) => (
                  <option key={value} value={value}>
                    {PARTNER_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | PartnerStatus)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Status</option>
                {(Object.keys(PARTNER_STATUS_LABELS) as PartnerStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {PARTNER_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3.5 text-[13px] text-[#8a7565]">{filtered.length} partner ditemukan</div>

      <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
        <div
          className="grid gap-3 px-4.5 py-3 text-[11px] font-bold tracking-[0.03em] text-white"
          style={{ gridTemplateColumns: TABLE_COLUMNS, background: "#e0662e" }}
        >
          <div>NAMA PARTNER</div>
          <div>PERUSAHAAN API-U TERKAIT</div>
          <div>JENIS</div>
          <div>SEKTOR / INDUSTRI</div>
          <div>KONTRAK AKTIF</div>
          <div>STATUS</div>
          <div>AKSI</div>
        </div>

        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[13px] text-[#ba1a1a]">Gagal memuat data partner.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="p-6 text-center text-[13px] text-[#8a7565]">
            {partners.length === 0 ? "Belum ada partner ditambahkan." : "Tidak ada partner yang cocok dengan filter."}
          </p>
        )}

        {filtered.map((partner) => (
          <div
            key={partner.id}
            className="grid items-center gap-3 border-t border-[#f5ebe1] px-4.5 py-3.5"
            style={{ gridTemplateColumns: TABLE_COLUMNS }}
          >
            <div className="text-[13px] font-bold text-[#2b2420]">{partner.company.companyName}</div>
            <div
              className="text-[12.5px] text-[#4a4038]"
              title={partner.relatedCompanies.map((c) => c.companyName).join(", ") || undefined}
            >
              {partner.relatedCompanies.length > 0 ? (
                partner.relatedCompanies.map((c) => c.companyName).join(", ")
              ) : (
                <span className="text-[#a68f80]">Belum ada relasi</span>
              )}
            </div>
            <div>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{ background: TYPE_BADGE[partner.type].bg, color: TYPE_BADGE[partner.type].color }}
              >
                {PARTNER_TYPE_LABELS[partner.type]}
              </span>
            </div>
            <div className="text-[12.5px] text-[#4a4038]">{partner.company.companyType}</div>
            <div className="text-[12.5px] text-[#4a4038]">
              {activeContractCountByCompany.get(partner.companyId) ?? 0} kontrak
            </div>
            <div>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{ background: STATUS_BADGE[partner.status].bg, color: STATUS_BADGE[partner.status].color }}
              >
                {PARTNER_STATUS_LABELS[partner.status]}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Link href={`/partners/${partner.id}`} className="text-[12.5px] font-semibold text-[#c14a1f]">
                Detail
              </Link>
              <Link href={`/partners/${partner.id}/edit`} className="text-[12.5px] font-semibold text-[#594138]">
                Edit
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(partner.id, partner.company.companyName)}
                className="text-[#a68f80]"
                title="Hapus dari Partner"
                aria-label={`Hapus ${partner.company.companyName} dari Partner`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
