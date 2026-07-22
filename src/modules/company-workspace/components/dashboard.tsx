"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  FileText,
  FolderOpen,
  History,
  LifeBuoy,
  Mail,
  Phone,
  PlusCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  statusBadgeVariant,
  type ApplicationStatusValue,
} from "../status";

type DashboardData = {
  totalCount: number;
  activeCount: number;
  statusCounts: Record<string, number>;
  requiredActions: { id: string; applicationNumber: string; status: string; message: string }[];
  recentActivities: { id: string; applicationNumber: string; status: string; updatedAt: string }[];
  latestApplication: {
    id: string;
    applicationNumber: string;
    status: ApplicationStatusValue;
    verificationType: string;
    updatedAt: string;
  } | null;
};

const QUICK_ACTIONS = [
  { label: "New Application", href: "/company-workspace/applications/new", icon: PlusCircle },
  { label: "Application List", href: "/company-workspace/applications", icon: FileText },
  { label: "Company Profile", href: "/company-workspace/profile", icon: ClipboardList },
  { label: "Supporting Documents", href: "/company-workspace/supporting/documents", icon: FolderOpen },
];

export function CompanyDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/dashboard");
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      return (await response.json()) as DashboardData;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan status verifikasi dan permohonan perusahaan Anda.
        </p>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dashboard. Pastikan Anda sudah login sebagai akun perusahaan.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data?.latestApplication ? (
              <div className="flex flex-col gap-1.5">
                <p className="font-mono text-xs text-muted-foreground">
                  {data.latestApplication.applicationNumber}
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                    {data.latestApplication.verificationType}
                  </span>
                  <Badge variant={statusBadgeVariant(data.latestApplication.status)}>
                    {STATUS_LABELS[data.latestApplication.status]}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada permohonan verifikasi.</p>
            )}
          </CardContent>
        </Card>

        {/* Active Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Active Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? "—" : data?.activeCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              dari total {isLoading ? "—" : data?.totalCount ?? 0} permohonan
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                size="sm"
                className="justify-start"
                nativeButton={false}
                render={<Link href={action.href} />}
              >
                <action.icon className="size-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Current Application Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Application Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && Object.keys(data.statusCounts).length > 0 ? (
              APPLICATION_STATUSES.filter((status) => data.statusCounts[status]).map((status) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status]}</Badge>
                  </span>
                  <span className="font-medium">{data.statusCounts[status]}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada permohonan yang tercatat.</p>
            )}
          </CardContent>
        </Card>

        {/* Required Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Required Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.requiredActions.length > 0 ? (
              data.requiredActions.map((action) => (
                <Link
                  key={action.id}
                  href={`/company-workspace/applications/${action.id}`}
                  className="flex flex-col gap-0.5 rounded-lg border border-border p-2.5 text-sm hover:bg-muted/40"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {action.applicationNumber}
                  </span>
                  <span>{action.message}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tindakan yang diperlukan saat ini.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.recentActivities.length > 0 ? (
              data.recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Permohonan <span className="font-mono text-xs">{activity.applicationNumber}</span>{" "}
                    berstatus <strong>{STATUS_LABELS[activity.status as ApplicationStatusValue]}</strong>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : data && data.recentActivities.length > 0 ? (
              data.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {activity.applicationNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.updatedAt).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="size-4" />
            Help &amp; Support
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
          <span className="flex items-center gap-2">
            <Mail className="size-4" /> support@verifikasi-impor.go.id
          </span>
          <span className="flex items-center gap-2">
            <Phone className="size-4" /> (021) 000-0000
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
