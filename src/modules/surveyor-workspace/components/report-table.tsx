"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SURVEY_REPORT_STATUSES,
  SURVEY_REPORT_STATUS_LABELS,
  surveyReportStatusBadgeVariant,
  type SurveyReportStatusValue,
} from "../status";

type ReportListItem = {
  id: string;
  assignmentId: string;
  status: SurveyReportStatusValue;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  submittedAt: string | null;
  updatedAt: string;
};

export function ReportTable() {
  const [status, setStatus] = useState<SurveyReportStatusValue | "ALL">("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "reports", { status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(`/api/surveyor-workspace/reports?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data report");
      return (await response.json()) as { data: ReportListItem[] };
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-8">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Draft dan submitted verification report Anda.
        </p>
      </div>

      <Select
        value={status}
        onValueChange={(value) => setStatus((value as SurveyReportStatusValue | "ALL") ?? "ALL")}
      >
        <SelectTrigger className="w-48">
          <SelectValue>
            {(value: string | null) =>
              value && value !== "ALL"
                ? SURVEY_REPORT_STATUS_LABELS[value as SurveyReportStatusValue]
                : "Semua Status"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua Status</SelectItem>
          {SURVEY_REPORT_STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {SURVEY_REPORT_STATUS_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Aplikasi</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Terakhir Diperbarui</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  Gagal memuat data report.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada report.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-mono text-xs">{report.applicationNumber}</TableCell>
                <TableCell className="font-medium">{report.companyName}</TableCell>
                <TableCell>{report.verificationType}</TableCell>
                <TableCell>
                  <Badge variant={surveyReportStatusBadgeVariant(report.status)}>
                    {SURVEY_REPORT_STATUS_LABELS[report.status]}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(report.updatedAt).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/surveyor-workspace/reports/${report.id}`} />}
                  >
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
