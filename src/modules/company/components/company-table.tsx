"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { avatarColor, fmtDate, initials, STATUS_LABEL, STATUS_STYLE, type CompanyStatusValue } from "../utils";

type CompanyListItem = {
  id: string;
  companyName: string;
  companyType: string;
  apiType: string | null;
  investmentStatus: string;
  status: CompanyStatusValue;
  createdAt: string;
  _count?: { applications: number };
};

type CompanyDraftItem = {
  id: string;
  companyName: string | null;
  currentStep: number;
  updatedAt: string;
};

export function CompanyTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [status, setStatus] = useState<"" | CompanyListItem["status"]>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Gagal memuat data perusahaan");
      const json = (await response.json()) as { data: CompanyListItem[] };
      return json.data;
    },
  });

  const { data: draftsData } = useQuery({
    queryKey: ["company-drafts"],
    queryFn: async () => {
      const response = await fetch("/api/companies/drafts");
      if (!response.ok) throw new Error("Gagal memuat draft");
      const json = (await response.json()) as { data: CompanyDraftItem[] };
      return json.data;
    },
  });
  const drafts = draftsData ?? [];

  async function handleDeleteDraft(id: string, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const response = await fetch(`/api/companies/drafts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Gagal menghapus draft");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["company-drafts"] });
  }

  const companies = useMemo(() => data ?? [], [data]);
  const companyTypes = useMemo(
    () => Array.from(new Set(companies.map((c) => c.companyType))).filter(Boolean),
    [companies],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (q && !c.companyName.toLowerCase().includes(q)) return false;
      if (companyType && c.companyType !== companyType) return false;
      if (status && c.status !== status) return false;
      return true;
    });
  }, [companies, search, companyType, status]);

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">Company List</div>
          <p className="mt-1 max-w-[560px] text-[13px] text-[#8a7565]">
            Kelola seluruh perusahaan terdaftar: profil, legalitas, riwayat assignment, dan status akun.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/company/new")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          + Tambah Perusahaan
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#2b2420]">Draft Tersimpan</span>
            <span className="rounded-full bg-[#fdeadd] px-2 py-0.5 text-[11px] font-bold text-[#c14a1f]">{drafts.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between rounded-lg border border-[#f0ded0] bg-[#fbf8f4] px-3.5 py-2.5">
                <div>
                  <div className="text-[13px] font-bold text-[#20180f]">{draft.companyName || "Perusahaan Baru (Draft)"}</div>
                  <div className="text-[11.5px] text-[#8a7565]">
                    Step {draft.currentStep}/6 &middot; Terakhir diubah {fmtDate(draft.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/company/new?draftId=${draft.id}`)}
                    className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#261813]"
                  >
                    Lanjutkan
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteDraft(draft.id, event)}
                    className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#ba1a1a]"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] text-[#594138]">⚗</span>
            <span className="text-[14px] font-bold text-[#2b2420]">Filter Perusahaan</span>
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
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Cari Perusahaan</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama perusahaan..."
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Tipe Perusahaan</div>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Tipe</option>
                {companyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | CompanyListItem["status"])}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3.5 text-[13px] text-[#8a7565]">{filtered.length} perusahaan ditemukan</div>

      <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
        <div
          className="grid gap-3 px-[18px] py-3 text-[11px] font-bold tracking-[0.03em] text-white"
          style={{ gridTemplateColumns: "0.6fr 2fr 0.9fr 0.9fr 1fr 0.9fr", background: "#e0662e" }}
        >
          <div>LOGO</div>
          <div>NAMA PERUSAHAAN</div>
          <div>JENIS API</div>
          <div>APPLICATION</div>
          <div>TANGGAL TERDAFTAR</div>
          <div>STATUS</div>
        </div>

        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[13px] text-[#ba1a1a]">Gagal memuat data perusahaan.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="p-6 text-center text-[13px] text-[#8a7565]">
            {companies.length === 0 ? "Belum ada perusahaan terdaftar." : "Tidak ada perusahaan yang cocok dengan filter."}
          </p>
        )}

        {filtered.map((company) => (
          <Link
            key={company.id}
            href={`/company/${company.id}`}
            className="grid items-center gap-3 border-t border-[#f5ebe1] px-[18px] py-3.5 hover:bg-[#fdf9f6]"
            style={{ gridTemplateColumns: "0.6fr 2fr 0.9fr 0.9fr 1fr 0.9fr" }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: avatarColor(company.companyName) }}
            >
              {initials(company.companyName)}
            </div>
            <div className="text-[13px] font-bold text-[#261813]">{company.companyName}</div>
            <div>
              {company.apiType ? (
                <span className="rounded-full bg-[#e6e9fb] px-2.5 py-1 text-[11px] font-bold text-[#4a4fb0]">
                  {company.apiType}
                </span>
              ) : (
                <span className="text-[12.5px] text-[#a68f80]">-</span>
              )}
            </div>
            <div className="text-[12.5px] text-[#4a4038]">{company._count?.applications ?? 0}</div>
            <div className="text-[12.5px] text-[#4a4038]">{fmtDate(company.createdAt)}</div>
            <div>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{ background: STATUS_STYLE[company.status].bg, color: STATUS_STYLE[company.status].color }}
              >
                {STATUS_LABEL[company.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
