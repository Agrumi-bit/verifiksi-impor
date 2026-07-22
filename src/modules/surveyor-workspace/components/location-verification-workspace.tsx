"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  LOCATION_TYPE_LABELS,
  LOCATION_VISIT_STATUS_LABELS,
  type LocationVisitStatusValue,
} from "../status";
import {
  DEFAULT_CHECKLIST_TEMPLATE,
  surveyReportDraftSchema,
  type SurveyReportDraftValues,
} from "../schema";
import { ChecklistTab } from "./verify/checklist-tab";
import { EvidenceTab } from "./verify/evidence-tab";
import { FindingsTab } from "./verify/findings-tab";
import { NotesTab } from "./verify/notes-tab";
import { ReviewTab } from "./verify/review-tab";

type LocationVisitData = {
  id: string;
  status: LocationVisitStatusValue;
  locationType: string;
  address: string;
  city: string | null;
  checklist: SurveyReportDraftValues["checklist"];
  photos: SurveyReportDraftValues["evidence"];
  findings: SurveyReportDraftValues["findings"];
  fieldObservationNotes: string | null;
};

type Props = { assignmentId: string; locationId: string };

export function LocationVerificationWorkspace({ assignmentId, locationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["surveyor-workspace", "assignments", assignmentId, "locations", locationId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`,
      );
      if (!response.ok) throw new Error("Lokasi tidak ditemukan");
      const json = (await response.json()) as { data: LocationVisitData };
      return json.data;
    },
  });

  const form = useForm<SurveyReportDraftValues>({
    resolver: zodResolver(surveyReportDraftSchema),
    defaultValues: { checklist: [], evidence: [], findings: [], notes: "" },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      checklist:
        data.checklist.length > 0
          ? data.checklist
          : DEFAULT_CHECKLIST_TEMPLATE.map((item) => ({ ...item, result: null, notes: "" })),
      evidence: data.photos,
      findings: data.findings,
      notes: data.fieldObservationNotes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, locationId]);

  const isCompleted = data?.status === "COMPLETED";

  const saveMutation = useMutation({
    mutationFn: async (values: SurveyReportDraftValues) => {
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/report`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan draft");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Draft berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      const saveResponse = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/report`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      if (!saveResponse.ok) {
        const body = await saveResponse.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan draft sebelum submit");
      }
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/report/submit`,
        { method: "POST" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal submit verifikasi lokasi");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Verifikasi lokasi berhasil disubmit.");
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
      router.push(`/surveyor-workspace/assignments/${assignmentId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal submit verifikasi lokasi");
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Lokasi tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  const checklist = form.watch("checklist");
  const evidence = form.watch("evidence");
  const findings = form.watch("findings");
  const notes = form.watch("notes");
  const label = LOCATION_TYPE_LABELS[data.locationType] ?? data.locationType;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {data.address}
              {data.city ? `, ${data.city}` : ""}
            </p>
            <h1 className="text-lg font-semibold">{label}</h1>
            <Badge variant={isCompleted ? "default" : "secondary"} className="mt-1">
              {LOCATION_VISIT_STATUS_LABELS[data.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isCompleted || saveMutation.isPending}
              onClick={() => saveMutation.mutate(form.getValues())}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Save Draft"}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/surveyor-workspace/assignments/${assignmentId}`} />}
            >
              Kembali ke Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap">
          <TabsTab value="checklist">Site Visit Checklist</TabsTab>
          <TabsTab value="evidence">Photo Evidence</TabsTab>
          <TabsTab value="findings">Finding &amp; Notes</TabsTab>
          <TabsTab value="notes">Field Observation</TabsTab>
          <TabsTab value="review">Visit Report</TabsTab>
        </TabsList>

        <TabsPanel value="checklist">
          <ChecklistTab form={form} disabled={isCompleted} />
        </TabsPanel>
        <TabsPanel value="evidence">
          <EvidenceTab form={form} disabled={isCompleted} />
        </TabsPanel>
        <TabsPanel value="findings">
          <FindingsTab form={form} disabled={isCompleted} />
        </TabsPanel>
        <TabsPanel value="notes">
          <NotesTab form={form} disabled={isCompleted} />
        </TabsPanel>
        <TabsPanel value="review">
          <ReviewTab
            checklist={checklist}
            evidenceCount={evidence.length}
            findingsCount={findings.length}
            hasNotes={Boolean(notes && notes.trim())}
            isSubmitting={submitMutation.isPending}
            isSubmitted={isCompleted}
            onSubmit={() => submitMutation.mutate()}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
