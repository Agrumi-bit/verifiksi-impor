"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileWarning,
  FlaskConical,
  PauseCircle,
  Tag,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "./kpi-card";
import { formatDate } from "./expiry-status";

type DashboardData = {
  kpis: {
    totalMerek: number;
    merekAktif: number;
    draft: number;
    merekTidakAktif: number;
    dokumenTidakLengkap: number;
    dokumenAkanKedaluwarsa: number;
    dokumenKedaluwarsa: number;
    hasilUjiMutuBermasalah: number;
    draftLama: number;
    potensiDuplikasi: number;
  };
  recentBrands: { id: string; brandName: string; status: string; createdAt: string; company: { companyName: string } | null }[];
  recentUpdates: { id: string; brandName: string; status: string; updatedAt: string; company: { companyName: string } | null }[];
  documentAlerts: { id: string; brandId: string; brandName: string; documentType: string; fileName: string; expiryDate: string }[];
  qualityTestAlerts: { id: string; brandId: string; brandName: string; certificateNumber: string; expiryDate: string }[];
};

/** Admin "Merk Management" landing page — platform-wide KPIs. Every
 * completeness/expiry/duplicate/draft number here comes from the same
 * `getDocumentsMonitoringSummary()` computation "Dokumen & Monitoring"
 * uses, so the two pages never disagree. No VIU Application metrics (that
 * linkage doesn't exist yet). */
export function AdminMerkDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "admin", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/merk/dashboard");
      if (!response.ok) throw new Error("Gagal memuat dashboard Merek");
      const json = (await response.json()) as { data: DashboardData };
      return json.data;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Merek Management</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan data merek pada seluruh platform.
        </p>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dashboard.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Merek" value={data?.kpis.totalMerek ?? 0} icon={Tag} href="/mitra/merk" isLoading={isLoading} />
        <KpiCard label="Merek Aktif" value={data?.kpis.merekAktif ?? 0} icon={CheckCircle2} href="/mitra/merk" isLoading={isLoading} />
        <KpiCard
          label="Draft"
          value={data?.kpis.draft ?? 0}
          icon={PauseCircle}
          href="/mitra/merk/drafts"
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Merek Tidak Aktif"
          value={data?.kpis.merekTidakAktif ?? 0}
          icon={XCircle}
          href="/mitra/merk"
          isLoading={isLoading}
        />
        <KpiCard
          label="Dokumen Tidak Lengkap"
          value={data?.kpis.dokumenTidakLengkap ?? 0}
          icon={FileWarning}
          href="/mitra/merk/documents"
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Dokumen Akan Kedaluwarsa"
          value={data?.kpis.dokumenAkanKedaluwarsa ?? 0}
          icon={AlertTriangle}
          href="/mitra/merk/documents"
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Dokumen Kedaluwarsa"
          value={data?.kpis.dokumenKedaluwarsa ?? 0}
          icon={XCircle}
          href="/mitra/merk/documents"
          isLoading={isLoading}
          tone="danger"
        />
        <KpiCard
          label="Hasil Uji Mutu Bermasalah"
          value={data?.kpis.hasilUjiMutuBermasalah ?? 0}
          icon={FlaskConical}
          href="/mitra/merk/quality-tests"
          isLoading={isLoading}
          tone="danger"
        />
        <KpiCard
          label="Draft > 30 Hari"
          value={data?.kpis.draftLama ?? 0}
          icon={PauseCircle}
          href="/mitra/merk/drafts"
          isLoading={isLoading}
          tone="warning"
        />
        <KpiCard
          label="Potensi Duplikasi"
          value={data?.kpis.potensiDuplikasi ?? 0}
          icon={Copy}
          href="/mitra/merk/documents"
          isLoading={isLoading}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Brands</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.recentBrands.length > 0 ? (
              data.recentBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/mitra/merk/${brand.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate">{brand.brandName}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {brand.company?.companyName ?? "—"}
                    <Badge variant={brand.status === "ACTIVE" ? "default" : "secondary"}>{brand.status}</Badge>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada merek.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.recentUpdates.length > 0 ? (
              data.recentUpdates.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/mitra/merk/${brand.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate">{brand.brandName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(brand.updatedAt).toLocaleString("id-ID")}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Document Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.documentAlerts.length > 0 ? (
              data.documentAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={`/mitra/merk/${alert.brandId}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate">
                    {alert.brandName} — {alert.fileName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(alert.expiryDate)}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada dokumen akan kedaluwarsa.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-amber-500" />
              Quality Test Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.qualityTestAlerts.length > 0 ? (
              data.qualityTestAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={`/mitra/merk/${alert.brandId}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate">
                    {alert.brandName} — {alert.certificateNumber}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(alert.expiryDate)}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada hasil uji mutu akan kedaluwarsa.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
