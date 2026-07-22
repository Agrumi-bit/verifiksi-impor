"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ChecklistItemValues,
  EvidenceItemValues,
  FindingItemValues,
} from "../schema";
import {
  SURVEY_REPORT_STATUS_LABELS,
  surveyReportStatusBadgeVariant,
  type SurveyReportStatusValue,
} from "../status";

type ReportDetailData = {
  id: string;
  status: SurveyReportStatusValue;
  checklist: ChecklistItemValues[];
  evidence: EvidenceItemValues[];
  findings: FindingItemValues[];
  notes: string | null;
  submittedAt: string | null;
  assignment: {
    assignmentNumber: string;
    application: {
      applicationNumber: string;
      verificationType: string;
      payload: { companyName?: string };
    };
  };
};

const RESULT_ICON: Record<string, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  NA: MinusCircle,
};

const RESULT_COLOR: Record<string, string> = {
  PASS: "text-emerald-500",
  FAIL: "text-destructive",
  NA: "text-muted-foreground",
};

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  MINOR: "secondary",
  MAJOR: "outline",
  CRITICAL: "destructive",
};

type Props = { id: string };

export function ReportDetail({ id }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "reports", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/reports/${id}`);
      if (!response.ok) throw new Error("Report tidak ditemukan");
      const json = (await response.json()) as { data: ReportDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Report tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  const payload = data.assignment.application.payload;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {data.assignment.application.applicationNumber}
            </p>
            <h1 className="text-lg font-semibold">{payload.companyName ?? "—"}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                {data.assignment.application.verificationType}
              </span>
              <Badge variant={surveyReportStatusBadgeVariant(data.status)}>
                {SURVEY_REPORT_STATUS_LABELS[data.status]}
              </Badge>
              {data.submittedAt && (
                <span className="text-xs text-muted-foreground">
                  Disubmit {new Date(data.submittedAt).toLocaleString("id-ID")}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/surveyor-workspace/assignments/${data.assignment.assignmentNumber}`} />}
          >
            Lihat Assignment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.checklist.length > 0 ? (
            data.checklist.map((item) => {
              const Icon = item.result ? RESULT_ICON[item.result] : MinusCircle;
              return (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className={"size-4 " + (item.result ? RESULT_COLOR[item.result] : "text-muted-foreground")} />
                    {item.item}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.notes}</span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada data checklist.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.evidence.length > 0 ? (
            data.evidence.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.category ?? "—"} · {item.filePath.split("/").pop()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada evidence yang diunggah.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.findings.length > 0 ? (
            data.findings.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada temuan yang dicatat.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Survey Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {data.notes || "Tidak ada catatan."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
