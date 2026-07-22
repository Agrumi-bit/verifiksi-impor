"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ASSIGNMENT_STATUS_LABELS,
  assignmentStatusBadgeVariant,
  type AssignmentStatusValue,
} from "../status";

type AssignmentListItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  scheduledDate: string | null;
  scheduledTime: string | null;
};

type DashboardData = {
  totalCount: number;
  activeCount: number;
  todaysAssignments: AssignmentListItem[];
  upcomingSchedule: AssignmentListItem[];
  pendingReports: AssignmentListItem[];
  returnedReports: AssignmentListItem[];
  recentActivities: AssignmentListItem[];
};

const QUICK_ACTIONS = [
  { label: "My Assignments", href: "/surveyor-workspace/assignments", icon: ClipboardList },
  { label: "My Schedule", href: "/surveyor-workspace/schedule", icon: CalendarDays },
  { label: "Reports", href: "/surveyor-workspace/reports", icon: FileBarChart },
];

function AssignmentRow({ assignment }: { assignment: AssignmentListItem }) {
  return (
    <Link
      href={`/surveyor-workspace/assignments/${assignment.assignmentNumber}`}
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
        <span>
          {assignment.scheduledDate
            ? new Date(assignment.scheduledDate).toLocaleDateString("id-ID")
            : "Belum dijadwalkan"}
          {assignment.scheduledTime ? ` · ${assignment.scheduledTime}` : ""}
        </span>
      </div>
    </Link>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

export function SurveyorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/surveyor-workspace/dashboard");
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      return (await response.json()) as DashboardData;
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan penugasan verifikasi dan jadwal Anda.
        </p>
      </div>

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data dashboard.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Today&apos;s Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.todaysAssignments.length > 0 ? (
              data.todaysAssignments.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada penugasan untuk hari ini." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.upcomingSchedule.length > 0 ? (
              data.upcomingSchedule.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada jadwal mendatang." />
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
            <div className="mt-1 rounded-lg border border-border p-2.5 text-xs text-muted-foreground">
              {isLoading ? "—" : `${data?.activeCount ?? 0} penugasan aktif dari ${data?.totalCount ?? 0} total.`}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Pending Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.pendingReports.length > 0 ? (
              data.pendingReports.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada draft report yang tertunda." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Returned Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <EmptyRow message="Memuat..." />
            ) : data && data.returnedReports.length > 0 ? (
              data.returnedReports.map((a) => <AssignmentRow key={a.id} assignment={a} />)
            ) : (
              <EmptyRow message="Tidak ada report yang dikembalikan." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {isLoading ? (
            <EmptyRow message="Memuat..." />
          ) : data && data.recentActivities.length > 0 ? (
            data.recentActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Penugasan <span className="font-mono text-xs">{a.applicationNumber}</span>{" "}
                  berstatus <strong>{ASSIGNMENT_STATUS_LABELS[a.status]}</strong>
                </span>
              </div>
            ))
          ) : (
            <EmptyRow message="Belum ada notifikasi." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
