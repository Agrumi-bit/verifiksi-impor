"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  TECHNICAL_MODULE_NAV_LABELS,
  VIU_MODULE_KEYS,
  VKI_MODULE_KEYS,
  type TechnicalModuleKey,
  type TechnicalModuleStatusValue,
} from "../../status";
import type { AnalysisData, ModuleProps } from "./analysis-types";
import { ListrikModule } from "./analysis/listrik-module";
import { KapasitasModule } from "./analysis/kapasitas-module";
import { BahanBakuModule } from "./analysis/bahanbaku-module";
import { RencanaModule } from "./analysis/rencana-module";
import { PenyimpananModule } from "./analysis/penyimpanan-module";
import { ModalModule } from "./analysis/modal-module";

type AnalysisTabProps = {
  assignmentNumber: string;
  verificationType: string;
};

type Draft = { status: TechnicalModuleStatusValue; keterangan: string; kesimpulan: string; inputs: Record<string, string> };

const MODULE_COMPONENT: Record<TechnicalModuleKey, (props: ModuleProps) => React.ReactNode> = {
  listrik: ListrikModule,
  kapasitas: KapasitasModule,
  bahanbaku: BahanBakuModule,
  rencana: RencanaModule,
  penyimpanan: PenyimpananModule,
  modal: ModalModule,
};

export function AnalysisTab({ assignmentNumber, verificationType }: AnalysisTabProps) {
  const queryClient = useQueryClient();
  const moduleKeys = verificationType === "VIU" ? VIU_MODULE_KEYS : VKI_MODULE_KEYS;
  const [activeModule, setActiveModule] = useState<TechnicalModuleKey>(moduleKeys[0]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["technical-analyst-workspace", "analysis", assignmentNumber],
    queryFn: async () => {
      const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/analysis`);
      if (!response.ok) throw new Error("Gagal memuat data analisis");
      return ((await response.json()) as { data: AnalysisData }).data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: { moduleKey: string; status: TechnicalModuleStatusValue; keterangan: string; kesimpulan: string; inputs: Record<string, string> }) => {
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

  function serverDraft(moduleKey: string): Draft {
    const saved = analysisData.technicalAnalysisData[moduleKey];
    return { status: saved?.status ?? "PENDING", keterangan: saved?.keterangan ?? "", kesimpulan: saved?.kesimpulan ?? "", inputs: saved?.inputs ?? {} };
  }

  function updateDraft(moduleKey: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [moduleKey]: { ...(prev[moduleKey] ?? serverDraft(moduleKey)), ...patch } }));
  }

  async function submitModule(moduleKey: string) {
    const draft = drafts[moduleKey] ?? serverDraft(moduleKey);
    setSubmittingKey(moduleKey);
    try {
      await mutation.mutateAsync({ moduleKey, ...draft });
      toast.success("Hasil analisis disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSubmittingKey(null);
    }
  }

  const draft = drafts[activeModule] ?? serverDraft(activeModule);
  const ActiveModuleComponent = MODULE_COMPONENT[activeModule];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {moduleKeys.map((key) => {
          const active = key === activeModule;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveModule(key)}
              className="rounded-lg px-4 py-2 text-[12px] font-bold"
              style={{
                background: active ? "#e0662e" : "#fff",
                color: active ? "#fff" : "#4a4038",
                border: `1px solid ${active ? "#e0662e" : "#e1bfb3"}`,
              }}
            >
              {TECHNICAL_MODULE_NAV_LABELS[key]}
            </button>
          );
        })}
      </div>

      <ActiveModuleComponent
        data={analysisData}
        inputs={draft.inputs}
        onInputChange={(key, value) => updateDraft(activeModule, { inputs: { ...draft.inputs, [key]: value } })}
        keterangan={draft.keterangan}
        onKeteranganChange={(value) => updateDraft(activeModule, { keterangan: value })}
        kesimpulan={draft.kesimpulan}
        onKesimpulanChange={(value) => updateDraft(activeModule, { kesimpulan: value })}
        status={draft.status}
        onMarkSesuai={() => updateDraft(activeModule, { status: "SESUAI" })}
        onMarkTidakSesuai={() => updateDraft(activeModule, { status: "TIDAK_SESUAI" })}
        onSubmit={() => submitModule(activeModule)}
        canEdit={canEdit}
        submitting={submittingKey === activeModule}
      />
    </div>
  );
}
