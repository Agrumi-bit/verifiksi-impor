"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown } from "lucide-react";

import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatusValue,
} from "../status";
import { getApplicationStatusDisplay } from "../application-status-display";

type ApplicationListItem = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  applicationCategory: string;
  companyName: string;
  status: ApplicationStatusValue;
  createdAt: string;
};

const PAGE_SIZE = 10;

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function CompanyApplicationTable() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatusValue | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "applications", { q, status, sort, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/company-workspace/applications?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      return (await response.json()) as {
        data: ApplicationListItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToApplication(application: ApplicationListItem) {
    if (application.status === "DRAFT") {
      router.push(`/company-workspace/applications/new?draftId=${application.id}`);
    } else {
      router.push(`/company-workspace/applications/${application.id}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[23px] font-bold tracking-tight text-[#20180f]">Applications</div>
          <div className="mt-1 text-[13.5px] text-[#8a7565]">Semua pengajuan verifikasi perusahaan Anda.</div>
        </div>
        <Link
          href="/company-workspace/applications/new"
          className="rounded-lg bg-[#e0662e] px-4 py-2.25 text-[13px] font-semibold text-white"
        >
          + New Application
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg border border-[#efe2d4] bg-white px-3.5 py-2.25 text-[#9c8a79]">
          <Search className="size-4 shrink-0" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari application ID…"
            className="w-full bg-transparent text-[12.5px] text-[#20180f] outline-none placeholder:text-[#9c8a79]"
          />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(event) => {
              setStatus((event.target.value as ApplicationStatusValue | "ALL") ?? "ALL");
              setPage(1);
            }}
            className="appearance-none rounded-lg border-none bg-transparent py-1.5 pl-1 pr-6 text-[12.5px] font-medium text-[#4a4038] outline-none"
          >
            <option value="ALL">All Status</option>
            {APPLICATION_STATUSES.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[#9c8a79]" />
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(event) => setSort((event.target.value as "newest" | "oldest") ?? "newest")}
            className="appearance-none rounded-lg border-none bg-transparent py-1.5 pl-1 pr-6 text-[12.5px] font-medium text-[#4a4038] outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[#9c8a79]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#efe2d4] bg-white">
        <div className="grid grid-cols-[1.3fr_0.7fr_1.4fr_1.6fr_1fr] gap-3 bg-[#fdf9f5] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-[#9c8a79]">
          <div>Application ID</div>
          <div>Jenis</div>
          <div>Tanggal Pengajuan</div>
          <div>Progress</div>
          <div>Status</div>
        </div>

        {isLoading && <div className="p-6 text-center text-[13px] text-[#a68f80]">Memuat...</div>}
        {isError && <div className="p-6 text-center text-[13px] text-[#c1361f]">Gagal memuat data permohonan.</div>}
        {!isLoading && !isError && data?.data.length === 0 && (
          <div className="p-6 text-center text-[13px] text-[#a68f80]">Belum ada permohonan yang sesuai.</div>
        )}

        {data?.data.map((application) => {
          const display = getApplicationStatusDisplay(application.status);
          return (
            <div
              key={application.id}
              onClick={() => goToApplication(application)}
              className="grid cursor-pointer grid-cols-[1.3fr_0.7fr_1.4fr_1.6fr_1fr] items-center gap-3 border-t border-[#f3e9dd] px-5 py-4 hover:bg-[#fdf9f5]"
            >
              <div className="text-[13.5px] font-semibold text-[#20180f]">{application.applicationNumber}</div>
              <div>
                <span className="rounded-md bg-[#f2ece5] px-2.5 py-0.75 text-[11px] font-bold text-[#4a4038]">
                  {application.verificationType}
                </span>
              </div>
              <div className="text-[13px] text-[#594138]">{fmtDate(application.createdAt)}</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2ece5]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${display.progress}%`, background: display.color }}
                  />
                </div>
                <span className="text-[11.5px] text-[#9c8a79]">{display.progress}%</span>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.25 text-[12px] font-semibold" style={{ color: display.color }}>
                  <span className="inline-block size-1.5 rounded-full" style={{ background: display.color }} />
                  {display.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-[#8a7565]">
          <p>
            Halaman {page} dari {totalPages} ({total} permohonan)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12.5px] font-semibold text-[#261813] disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12.5px] font-semibold text-[#261813] disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
