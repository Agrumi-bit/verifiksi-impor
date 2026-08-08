"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Handshake } from "lucide-react";

type DashboardStats = {
  applications: number;
  companies: number;
  partnerIndustri: number;
  partnerNonIndustri: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  isLoading,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  href: string;
  isLoading: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:bg-muted/40"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-2xl font-semibold">{isLoading ? "—" : value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export function DashboardStatsGrid() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Gagal memuat statistik");
      const json = (await response.json()) as { data: DashboardStats };
      return json.data;
    },
  });

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Gagal memuat statistik dashboard. Pastikan database sudah terhubung.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Aplikasi"
        value={data?.applications ?? 0}
        icon={FileText}
        href="/applications/new"
        isLoading={isLoading}
      />
      <StatCard
        label="Perusahaan Terdaftar"
        value={data?.companies ?? 0}
        icon={Building2}
        href="/company"
        isLoading={isLoading}
      />
      <StatCard
        label="Partner Industri"
        value={data?.partnerIndustri ?? 0}
        icon={Handshake}
        href="/partners"
        isLoading={isLoading}
      />
      <StatCard
        label="Partner Non Industri"
        value={data?.partnerNonIndustri ?? 0}
        icon={Handshake}
        href="/partners"
        isLoading={isLoading}
      />
    </div>
  );
}
