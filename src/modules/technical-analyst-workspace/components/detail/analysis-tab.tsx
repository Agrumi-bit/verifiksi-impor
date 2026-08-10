"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/form/rich-text-editor";
import {
  TECHNICAL_MODULE_LABELS,
  TECHNICAL_MODULE_STATUS_BADGE,
  TECHNICAL_MODULE_STATUS_LABELS,
  VIU_MODULE_KEYS,
  VKI_MODULE_KEYS,
  type TechnicalModuleKey,
  type TechnicalModuleStatusValue,
} from "../../status";
import type { AnalysisData } from "./analysis-types";
import {
  BahanBakuModuleContent,
  KapasitasModuleContent,
  ListrikModuleContent,
  ModalModuleContent,
  PenyimpananModuleContent,
  RencanaModuleContent,
} from "./analysis-modules";

type AnalysisTabProps = {
  assignmentNumber: string;
  verificationType: string;
};

type Draft = { keterangan: string; kesimpulan: string; inputs: Record<string, string> };

const MODULE_CONTENT: Record<TechnicalModuleKey, (props: Parameters<typeof ListrikModuleContent>[0]) => React.ReactNode> = {
  listrik: ListrikModuleContent,
  kapasitas: KapasitasModuleContent,
  bahanbaku: BahanBakuModuleContent,
  rencana: RencanaModuleContent,
  penyimpanan: PenyimpananModuleContent,
  modal: ModalModuleContent,
};

export function AnalysisTab({ assignmentNumber, verificationType }: AnalysisTabProps) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["technical-analyst-workspace", "analysis", assignmentNumber],
    queryFn: async () => {
      const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/analysis`);
      if (!response.ok) throw new Error("Gagal memuat data analisis");
      return ((await response.json()) as { data: AnalysisData }).data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: { moduleKey: string; status?: TechnicalModuleStatusValue; keterangan?: string; kesimpulan?: string; inputs?: Record<string, string> }) => {
      const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error ?? "Gagal menyimpan analisis");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-analyst-workspace", "analysis", assignmentNumber] });
      queryClient.invalidateQueries({ queryKey: ["technical-analyst-workspace", "assignment", assignmentNumber] });
    },
  });

  if (isLoading) return <div className="p-6 text-center text-[#a68f80]">Memuat...</div>;
  if (isError || !data) return <div className="p-6 text-center text-[#c1361f]">Gagal memuat data analisis.</div>;

  const analysisData = data;
  const canEdit = analysisData.status === "SUBMITTED";
  const moduleKeys = verificationType === "VIU" ? VIU_MODULE_KEYS : VKI_MODULE_KEYS;

  function serverDraft(moduleKey: string): Draft {
    const saved = analysisData.technicalAnalysisData[moduleKey];
    return { keterangan: saved?.keterangan ?? "", kesimpulan: saved?.kesimpulan ?? "", inputs: saved?.inputs ?? {} };
  }

  function updateDraft(moduleKey: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [moduleKey]: { ...(prev[moduleKey] ?? serverDraft(moduleKey)), ...patch } }));
  }

  async function setStatus(moduleKey: string, status: TechnicalModuleStatusValue) {
    setSavingKey(moduleKey);
    try {
      await mutation.mutateAsync({ moduleKey, status });
      toast.success(`Modul ditandai ${TECHNICAL_MODULE_STATUS_LABELS[status]}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveNotes(moduleKey: string) {
    const draft = drafts[moduleKey] ?? serverDraft(moduleKey);
    setSavingKey(moduleKey);
    try {
      await mutation.mutateAsync({ moduleKey, keterangan: draft.keterangan, kesimpulan: draft.kesimpulan, inputs: draft.inputs });
      toast.success("Catatan analisis disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {moduleKeys.map((moduleKey) => {
        const decision = analysisData.technicalAnalysisData[moduleKey];
        const status = decision?.status ?? "PENDING";
        const draft = drafts[moduleKey] ?? serverDraft(moduleKey);
        const ContentComponent = MODULE_CONTENT[moduleKey];

        return (
          <div key={moduleKey} className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[14px] font-extrabold text-[#20180f]">{TECHNICAL_MODULE_LABELS[moduleKey]}</div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[status]}`}>
                {TECHNICAL_MODULE_STATUS_LABELS[status]}
              </span>
            </div>

            <ContentComponent
              data={data}
              inputs={draft.inputs}
              canEdit={canEdit}
              onInputChange={(key, value) => updateDraft(moduleKey, { inputs: { ...draft.inputs, [key]: value } })}
            />

            <div className="mt-4 border-t border-[#f0ded0] pt-4">
              <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Uraian Observasi</div>
              <div className="mb-3">
                <RichTextEditor
                  value={draft.keterangan}
                  placeholder="Uraikan hasil analisis..."
                  disabled={!canEdit}
                  onChange={(html) => updateDraft(moduleKey, { keterangan: html })}
                />
              </div>
              <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Kesimpulan</div>
              <RichTextEditor
                value={draft.kesimpulan}
                placeholder="Tulis kesimpulan analisis..."
                disabled={!canEdit}
                onChange={(html) => updateDraft(moduleKey, { kesimpulan: html })}
              />

              {canEdit && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    disabled={savingKey === moduleKey}
                    onClick={() => saveNotes(moduleKey)}
                    className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
                  >
                    Simpan Catatan &amp; Kesimpulan
                  </button>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      disabled={savingKey === moduleKey}
                      onClick={() => setStatus(moduleKey, "TIDAK_SESUAI")}
                      className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#c1361f] disabled:opacity-50"
                    >
                      Tidak Sesuai
                    </button>
                    <button
                      type="button"
                      disabled={savingKey === moduleKey}
                      onClick={() => setStatus(moduleKey, "SESUAI")}
                      className="rounded-lg bg-[#1a9850] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      Sesuai
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
