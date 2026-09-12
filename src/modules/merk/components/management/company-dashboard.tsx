"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileWarning, FlaskConical, PauseCircle, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KpiCard } from "./kpi-card";

type DashboardData = {
  kpis: {
    totalMerek: number;
    merekAktif: number;
    draft: number;
    dokumenTidakLengkap: number;
    dokumenAkanKedaluwarsa: number;
    hasilUjiMutuAkanKedaluwarsa: number;
  };
  recentBrands: { id: string; brandName: string; status: string; createdAt: string }[];
};

const BASE = "/company-workspace/supporting/brands";

/** Company Workspace "Merek" landing page — this company's own brands only
 * (server-scoped by companyId in /api/company-workspace/brands/dashboard). */
export function CompanyMerkDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "company", "dashboard"],
    queryFn: async () => {
      const response = await fetch(`${BASE}/dashboard`);
      if (!response.ok) throw new Error("Gagal memuat dashboard merek");
      const json = (await response.json()) as { data: DashboardData };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Dashboard Merek</h1>
        <p className="text-sm text-muted-foreground">Ringkasan merek milik perusahaan Anda.</p>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dashboard. Pastikan Anda sudah login sebagai akun perusahaan.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Merek" value={data?.kpis.totalMerek ?? 0} icon={Tag} href={BASE} isLoading={isLoading} />
        <KpiCard
          label="Merek Aktif"
          value={data?.kpis.merekAktif ?? 0}
          icon={CheckCircle2}
          href={BASE}
          isLoading={isLoading}
        />
        <KpiCard
          label="Draft"
          value={data?.kpis.draft ?? 0}
          icon={PauseCircle}
          href={`${BASE}/drafts`}
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Dokumen Tidak Lengkap"
          value={data?.kpis.dokumenTidakLengkap ?? 0}
          icon={FileWarning}
          href={`${BASE}/documents`}
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Dokumen Akan Kedaluwarsa"
          value={data?.kpis.dokumenAkanKedaluwarsa ?? 0}
          icon={AlertTriangle}
          href={`${BASE}/documents`}
          isLoading={isLoading}
          tone="danger"
        />
        <KpiCard
          label="Hasil Uji Mutu Akan Kedaluwarsa"
          value={data?.kpis.hasilUjiMutuAkanKedaluwarsa ?? 0}
          icon={FlaskConical}
          href={`${BASE}/quality-tests`}
          isLoading={isLoading}
          tone="danger"
        />
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-semibold">Recent Brands</p>
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : data && data.recentBrands.length > 0 ? (
            data.recentBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`${BASE}/${brand.id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
              >
                <span className="min-w-0 truncate">{brand.brandName}</span>
                <Badge variant={brand.status === "ACTIVE" ? "default" : brand.status === "DRAFT" ? "outline" : "secondary"}>
                  {brand.status}
                </Badge>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada merek terdaftar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
