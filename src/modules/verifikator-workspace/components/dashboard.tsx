"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileBarChart,
  Inbox,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSIGNMENT_STATUS_LABELS, assignmentStatusBadgeVariant, type AssignmentStatusValue } from "../status";

type ListItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  dueDate: string | null;
  updatedAt: string;
};

type DashboardData = {
  unclaimedQueueCount: number;
  myActiveCount: number;
  completedCount: number;
  returnedCount: number;
  pendingReview: ListItem[];
  unclaimedQueue: ListItem[];
  dueSoon: ListItem[];
  recentDecisions: ListItem[];
};

const QUICK_ACTIONS = [
  { label: "My Assignment", href: "/verifikator-workspace/my-assignment", icon: ListChecks },
  { label: "Approval Center", href: "/verifikator-workspace/approval-center", icon: ClipboardCheck },
  { label: "Reports", href: "/verifikator-workspace/reports", icon: FileBarChart },
];

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function AssignmentRow({ assignment }: { assignment: ListItem }) {
  return (
    <Link
      href={`/verifikator-workspace/assignments/${assignment.assignmentNumber}`}
      className="flex flex-col gap-1 rounded-lg border border-border p-2.5 text-sm hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{assignment.companyName}</span>
        <Badge variant={assignmentStatusBadgeVariant(assignment.status)}>
          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{assignment.applicationNumber}</span>
        <span>Due: {fmtDate(assignment.dueDate)}</span>
      </div>
    </Link>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

export function VerifikatorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/dashboard");
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      return (await response.json()) as DashboardData;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan antrean validasi dan penugasan Anda sebagai Verifikator.
        </p>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dashboard.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Approval Queue</p>
              <p className="text-2xl font-bold">{isLoading ? "—" : data?.unclaimedQueueCount ?? 0}</p>
            </div>
            <Inbox className="size-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Sedang Direview</p>
              <p className="text-2xl font-bold text-[#3454d1]">{isLoading ? "—" : data?.myActiveCount ?? 0}</p>
            </div>
            <ClipboardCheck className="size-8 text-[#3454d1]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Disetujui</p>
              <p className="text-2xl font-bold text-[#0f7a4d]">{isLoading ? "—" : data?.completedCount ?? 0}</p>
            </div>
            <ListChecks className="size-8 text-[#0f7a4d]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Dikembalikan</p>
              <p className="text-2xl font-bold text-[#c1352b]">{isLoading ? "—" : data?.returnedCount ?? 0}</p>
            </div>
            <AlertTriangle className="size-8 text-[#c1352b]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Menunggu Review Saya
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.pendingReview.length > 0 ? (
              data.pendingReview.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada assignment yang sedang direview." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-4" />
              Approval Queue (Belum Diklaim)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.unclaimedQueue.length > 0 ? (
              data.unclaimedQueue.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada antrean approval." />
            )}
          </CardContent>
        </Card>

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-amber-500" />
              Jatuh Tempo Segera
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.dueSoon.length > 0 ? (
              data.dueSoon.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada assignment yang mendekati due date." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Keputusan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.recentDecisions.length > 0 ? (
              data.recentDecisions.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Belum ada keputusan yang diambil." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
