"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  TECHNICAL_MODULE_NAV_LABELS,
  technicalModuleKeysFor,
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
import { KebutuhanNonIndustriModule } from "./analysis/kebutuhan-non-industri-module";
import { StokKonsumsiModule } from "./analysis/stok-konsumsi-module";
import { LhvkiSummaryPanel } from "./analysis/lhvki-summary-panel";

type AnalysisTabProps = {
  assignmentNumber: string;
  verificationType: string;
};

type Draft = { status: TechnicalModuleStatusValue; keterangan: string; kesimpulan: string; inputs: Record<string, string> };

export const MODULE_COMPONENT: Record<TechnicalModuleKey, (props: ModuleProps) => React.ReactNode> = {
  listrik: ListrikModule,
  kapasitas: KapasitasModule,
  bahanbaku: BahanBakuModule,
  rencana: RencanaModule,
  kebutuhanNonIndustri: KebutuhanNonIndustriModule,
  stokKonsumsi: StokKonsumsiModule,
  penyimpanan: PenyimpananModule,
  modal: ModalModule,
};

export function AnalysisTab({ assignmentNumber, verificationType }: AnalysisTabProps) {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<TechnicalModuleKey | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  // Autosave: Catatan Analis / Kesimpulan / isian of every module are saved shortly after typing (and
  // when the tab is left), so switching tabs never loses them. The Sesuai/Tidak Sesuai decision is
  // still saved only with "Simpan Hasil Analisis".
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirtyRef = useRef<Set<string>>(new Set());
  const draftsRef = useRef(drafts);
  const editableRef = useRef(false);

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

  const flushAutosave = useCallback(
    async (keepalive = false) => {
      if (!editableRef.current || dirtyRef.current.size === 0) return;
      const keys = [...dirtyRef.current];
      dirtyRef.current.clear();
      if (!keepalive) setAutosave("saving");
      try {
        for (const moduleKey of keys) {
          const d = draftsRef.current[moduleKey];
          if (!d) continue;
          const response = await fetch(`/api/technical-analyst-workspace/assignments/${assignmentNumber}/analysis`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moduleKey, keterangan: d.keterangan, kesimpulan: d.kesimpulan, inputs: d.inputs }),
            keepalive,
          });
          if (!response.ok) throw new Error("autosave");
          queryClient.setQueryData<AnalysisData>(["technical-analyst-workspace", "analysis", assignmentNumber], (old) =>
            old
              ? {
                  ...old,
                  technicalAnalysisData: {
                    ...old.technicalAnalysisData,
                    [moduleKey]: { ...old.technicalAnalysisData[moduleKey], keterangan: d.keterangan, kesimpulan: d.kesimpulan, inputs: d.inputs },
                  },
                }
              : old,
          );
        }
        if (!keepalive) setAutosave("saved");
      } catch {
        for (const k of keys) dirtyRef.current.add(k);
        if (!keepalive) setAutosave("error");
      }
    },
    [assignmentNumber, queryClient],
  );

  useEffect(() => {
    draftsRef.current = drafts;
    if (dirtyRef.current.size === 0) return;
    const timer = setTimeout(() => void flushAutosave(), 1200);
    return () => clearTimeout(timer);
  }, [drafts, flushAutosave]);

  useEffect(() => {
    const onLeave = () => void flushAutosave(true);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      onLeave(); // tab switched / page left — save what is still pending
    };
  }, [flushAutosave]);

  useEffect(() => {
    editableRef.current = Boolean(data && (data.reviewable ?? data.status === "SUBMITTED"));
  }, [data]);

  if (isLoading) return <div className="p-6 text-center text-[#a68f80]">Memuat...</div>;
  if (isError || !data) return <div className="p-6 text-center text-[#c1361f]">Gagal memuat data analisis.</div>;

  const analysisData = data;
  // Modules follow the application's scheme(s): VKI, or each VIU import type's own module plus Gudang & Modal.
  const moduleKeys = technicalModuleKeysFor(analysisData.verificationType ?? verificationType, analysisData.importTypes);
  const activeModule: TechnicalModuleKey = selectedModule && moduleKeys.includes(selectedModule) ? selectedModule : moduleKeys[0];
  const setActiveModule = (key: TechnicalModuleKey) => {
    setShowSummary(false);
    setSelectedModule(key);
  };
  const isVki = (analysisData.verificationType ?? verificationType) === "VKI";
  // SUBMITTED, or reopened after a resubmitted revision (see isAssignmentReviewable).
  const canEdit = analysisData.reviewable ?? analysisData.status === "SUBMITTED";

  function serverDraft(moduleKey: string): Draft {
    const saved = analysisData.technicalAnalysisData[moduleKey];
    return { status: saved?.status ?? "PENDING", keterangan: saved?.keterangan ?? "", kesimpulan: saved?.kesimpulan ?? "", inputs: saved?.inputs ?? {} };
  }

  function updateDraft(moduleKey: string, patch: Partial<Draft>) {
    if (canEdit && ("keterangan" in patch || "kesimpulan" in patch || "inputs" in patch)) dirtyRef.current.add(moduleKey);
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
  // Modules read each other's figures (Kebutuhan Bahan Baku uses Kapasitas Hasil VKI), so hand them
  // the saved data with every unsaved draft laid over it.
  const liveData: AnalysisData = {
    ...analysisData,
    technicalAnalysisData: {
      ...analysisData.technicalAnalysisData,
      ...Object.fromEntries(Object.entries(drafts).map(([k, d]) => [k, { ...analysisData.technicalAnalysisData[k], ...d }])),
    },
  };
  const ActiveModuleComponent = MODULE_COMPONENT[activeModule];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {moduleKeys.map((key) => {
          const active = !showSummary && key === activeModule;
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
        {isVki && (
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="rounded-lg px-4 py-2 text-[12px] font-bold"
            style={{
              background: showSummary ? "#1a3a6b" : "#fff",
              color: showSummary ? "#fff" : "#1a3a6b",
              border: `1px solid ${showSummary ? "#1a3a6b" : "#b7c4dc"}`,
            }}
          >
            Ringkasan LHVKI
          </button>
        )}
        {canEdit && autosave !== "idle" && (
          <span className={`self-center text-[11px] ${autosave === "error" ? "text-[#c1361f]" : "text-[#8a7565]"}`}>
            {autosave === "saving" ? "Menyimpan catatan…" : autosave === "saved" ? "Catatan tersimpan otomatis" : "Catatan gagal tersimpan — coba lagi"}
          </span>
        )}
      </div>

      {showSummary && isVki ? (
        <LhvkiSummaryPanel data={liveData} moduleKeys={moduleKeys} />
      ) : (
      <ActiveModuleComponent
        data={liveData}
        inputs={draft.inputs}
        onInputChange={(key, value) => updateDraft(activeModule, { inputs: { ...draft.inputs, [key]: value } })}
        keterangan={draft.keterangan}
        onKeteranganChange={(value) => updateDraft(activeModule, { keterangan: value })}
        kesimpulan={draft.kesimpulan}
        onKesimpulanChange={(value) => updateDraft(activeModule, { kesimpulan: value })}
        status={draft.status}
        onMarkSesuai={() => updateDraft(activeModule, { status: "SESUAI" })}
        onMarkTidakSesuai={() => updateDraft(activeModule, { status: "TIDAK_SESUAI" })}
        onMarkSesuaiCatatan={() => updateDraft(activeModule, { status: "SESUAI_CATATAN" })}
        onSubmit={() => submitModule(activeModule)}
        canEdit={canEdit}
        submitting={submittingKey === activeModule}
      />
      )}
    </div>
  );
}
