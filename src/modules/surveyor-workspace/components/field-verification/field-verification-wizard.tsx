"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { LOCATION_VISIT_STATUS_LABELS, type LocationVisitStatusValue } from "../../status";
import {
  computeFindings,
  computeSectionKinds,
  emptyFieldVerification,
  fieldVerificationSchema,
  sectionTitles,
  LOCATION_LABEL,
  type DocCheckValues,
  type FieldKind,
  type FieldVerificationValues,
} from "./schema";
import { Section0Date } from "./section-0-date";
import { Section1DocsQuestions } from "./section-1-docs-questions";
import { SectionOwnership } from "./section-ownership";
import { SectionLegality } from "./section-legality";
import { SectionQuestionsBlock } from "../office-verification/section-questions-block";
import { SectionCapacity } from "./section-capacity";
import { SectionDocumentation } from "./section-documentation";
import { SectionFindings } from "./section-findings";
import { SectionConclusion } from "./section-conclusion";
import { FieldVerificationSidebar } from "./sidebar";
import { SECTION4_QUESTIONS, SECTION6_QUESTIONS } from "./schema";

type PayloadLocation = {
  buildingStatus?: "MILIK_SENDIRI" | "SEWA" | null;
  ownershipDocumentPath?: string | null;
  leaseDocumentPath?: string | null;
  leaseOriginalOwnerName?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  province?: string | null;
  warehouseRegistrationType?: string | null;
  warehouseRegistrationNumber?: string | null;
  warehouseRegistrationIssueDate?: string | null;
  warehouseRegistrationIssuingAuthority?: string | null;
  warehouseRegistrationDocumentPath?: string | null;
};

type LocationDetail = {
  id: string;
  status: LocationVisitStatusValue;
  locationType: string;
  address: string;
  city: string | null;
  warehouseVerification: FieldVerificationValues | null;
  factoryVerification: FieldVerificationValues | null;
  company: {
    companyName: string;
    nibDocumentPath: string | null;
    notarialDocumentPath: string | null;
    kbliEntries: { code: string; description: string }[];
    kbliDocumentPath: string | null;
  };
  payloadLocation: PayloadLocation | null;
};

function buildDefaultSection1Docs(company: LocationDetail["company"], payloadLocation: PayloadLocation | null): DocCheckValues[] {
  const docs: DocCheckValues[] = [];
  if (company.nibDocumentPath) docs.push({ key: "nib", name: "NIB", status: "pending", addressText: "" });
  if (company.notarialDocumentPath) docs.push({ key: "akta", name: "Akta Notaris", status: "pending", addressText: "" });
  const isSewa = payloadLocation?.buildingStatus === "SEWA";
  const ownershipDocPath = isSewa ? payloadLocation?.leaseDocumentPath : payloadLocation?.ownershipDocumentPath;
  if (ownershipDocPath) {
    docs.push({ key: "kepemilikan", name: isSewa ? "Dokumen Sewa Lokasi" : "Dokumen Kepemilikan Lokasi", status: "pending", addressText: "" });
  }
  return docs;
}

type Props = { kind: FieldKind; assignmentId: string; locationId: string };

export function FieldVerificationWizard({ kind, assignmentId, locationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["surveyor-workspace", "assignments", assignmentId, "locations", locationId];
  const apiField = kind === "GUDANG" ? "warehouse-verification" : "factory-verification";
  const dataField = kind === "GUDANG" ? "warehouseVerification" : "factoryVerification";
  const label = LOCATION_LABEL[kind];
  const titles = useMemo(() => sectionTitles(kind), [kind]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`);
      if (!response.ok) throw new Error("Lokasi tidak ditemukan");
      const json = (await response.json()) as { data: LocationDetail };
      return json.data;
    },
  });

  const [values, setValues] = useState<FieldVerificationValues>(emptyFieldVerification());
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);

  if (data && data.id !== loadedForId) {
    setLoadedForId(data.id);
    setValues(
      data[dataField] ?? {
        ...emptyFieldVerification(),
        section1Docs: buildDefaultSection1Docs(data.company, data.payloadLocation),
      },
    );
  }

  const isCompleted = data?.status === "COMPLETED";

  function patch(partial: Partial<FieldVerificationValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  const saveMutation = useMutation({
    mutationFn: async (next: FieldVerificationValues) => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/${apiField}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldVerificationSchema.parse(next)),
      });
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
      const saveResponse = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/${apiField}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldVerificationSchema.parse(values)),
      });
      if (!saveResponse.ok) {
        const body = await saveResponse.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan draft sebelum submit");
      }
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/report/submit`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Gagal submit verifikasi ${label.toLowerCase()}`);
      }
      return response.json();
    },
    onSuccess: () => {
      setShowSubmitConfirm(false);
      toast.success(`Verifikasi lokasi ${label.toLowerCase()} berhasil disubmit.`);
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
      router.push(`/surveyor-workspace/assignments/${assignmentId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : `Gagal submit verifikasi ${label.toLowerCase()}`);
    },
  });

  const buildingStatus = data?.payloadLocation?.buildingStatus ?? null;
  const kinds = useMemo(() => computeSectionKinds(kind, values, buildingStatus), [kind, values, buildingStatus]);
  const rangeText = kind === "GUDANG" ? "Section 1-6" : "Section 1-5";
  const findings = useMemo(() => computeFindings(kind, values), [kind, values]);

  function saveAndGoTo(next: number | null) {
    saveMutation.mutate(values);
    setOpenStep(next);
  }

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">Lokasi tidak ditemukan, atau bukan milik Anda.</p>;
  }

  const stepColor = (k: (typeof kinds)[number]) => (k === "issue" ? "#dc2626" : k === "ok" ? "#16a34a" : "#e6b800");

  // Section index map (Pabrik skips the capacity section, so indices from
  // "Aktivitas Operasional" onward shift down by one compared to Gudang).
  const hasCapacity = kind === "GUDANG";
  const idxActivity = hasCapacity ? 6 : 5;
  const idxDocumentation = idxActivity + 1;
  const idxFindings = idxDocumentation + 1;
  const idxConclusion = idxFindings + 1;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-[#1c2530]">
      <div className="min-w-0 flex-1 overflow-y-auto p-8 sm:p-10">
        <Link href={`/surveyor-workspace/assignments/${assignmentId}`} className="mb-[22px] flex w-fit items-center gap-2 text-sm font-semibold text-[#1c2530]">
          <MaterialIcon name="arrow_back" className="text-lg" />
          Back
        </Link>

        <h1 className="mb-3.5 text-[28px] font-extrabold">Verifikasi Lokasi {label}</h1>
        <p className="mb-7 max-w-3xl text-[14.5px] leading-relaxed text-[#4a5568]">
          Verifikasi {label.toLowerCase()} dilakukan untuk memastikan bahwa lokasi{" "}
          {kind === "GUDANG" ? "penyimpanan barang" : "fasilitas produksi"} yang tercantum dalam dokumen permohonan
          benar-benar ada dan sesuai dengan data yang diajukan. Proses verifikasi meliputi observasi langsung
          terhadap legalitas, kondisi fisik, {kind === "GUDANG" ? "kapasitas penyimpanan, " : ""}serta aktivitas
          operasional {label.toLowerCase()}.
        </p>

        <div className="flex items-center justify-between gap-5 rounded-[14px] border-[1.5px] border-[#f26522] bg-white p-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex size-[68px] shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[#e4e8ee] bg-[#fff1ec] text-lg font-extrabold text-[#a63b00]">
              {data.company.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-semibold text-[#1c2530]">{label}</span>
                <span className="whitespace-nowrap rounded-md bg-[#22c55e] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {LOCATION_VISIT_STATUS_LABELS[data.status]}
                </span>
                {buildingStatus && (
                  <span className="whitespace-nowrap rounded-md bg-[#e0662e] px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {buildingStatus === "SEWA" ? "Sewa" : "Milik Sendiri"}
                  </span>
                )}
              </div>
              <div className="mb-1 truncate text-[22px] font-extrabold leading-tight text-[#1c2530]">{data.company.companyName}</div>
              <div className="text-sm leading-tight text-[#4a5568]">
                {data.address}
                {data.city ? `, ${data.city}` : ""}
              </div>
            </div>
          </div>
          <MaterialIcon name="location_on" className="shrink-0 text-[44px] text-[#34a853]" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {titles.map((_, n) => {
            const active = openStep === n;
            return (
              <button
                type="button"
                key={n}
                onClick={() => setOpenStep(openStep === n ? null : n)}
                className="flex size-[38px] items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: active ? "#3b82f6" : stepColor(kinds[n]), border: `1.5px solid ${active ? "#3b82f6" : stepColor(kinds[n])}` }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {openStep === 0 && (
          <Section0Date values={values} onChange={patch} onSave={() => saveMutation.mutate(values)} onSaveNext={() => saveAndGoTo(1)} isSaving={saveMutation.isPending} />
        )}
        {openStep === 1 && (
          <Section1DocsQuestions
            kind={kind}
            docs={values.section1Docs}
            answers={values.section1Answers}
            onDocChange={(key, docPatch) => patch({ section1Docs: values.section1Docs.map((d) => (d.key === key ? { ...d, ...docPatch } : d)) })}
            onAnswer={(key, v) => patch({ section1Answers: { ...values.section1Answers, [key]: v } })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(2)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 2 && (
          <SectionOwnership
            kind={kind}
            buildingStatus={buildingStatus}
            payloadLocation={data.payloadLocation}
            ownershipAnswer={values.ownershipAnswer}
            sewaAnswers={values.sewaAnswers}
            notes={values.section2Notes ?? ""}
            onOwnershipAnswer={(v) => patch({ ownershipAnswer: v })}
            onSewaAnswer={(key, v) => patch({ sewaAnswers: { ...values.sewaAnswers, [key]: v } })}
            onNotesChange={(v) => patch({ section2Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(3)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 3 && (
          <SectionLegality
            kind={kind}
            warehouseData={
              kind === "GUDANG"
                ? {
                    registrationType: data.payloadLocation?.warehouseRegistrationType,
                    registrationNumber: data.payloadLocation?.warehouseRegistrationNumber,
                    issueDate: data.payloadLocation?.warehouseRegistrationIssueDate,
                    issuingAuthority: data.payloadLocation?.warehouseRegistrationIssuingAuthority,
                    documentPath: data.payloadLocation?.warehouseRegistrationDocumentPath,
                  }
                : null
            }
            kbliEntries={kind === "PABRIK" ? data.company.kbliEntries : undefined}
            kbliDocumentPath={kind === "PABRIK" ? data.company.kbliDocumentPath : undefined}
            answers={values.legalityAnswers}
            notes={values.legalityNotes ?? ""}
            onAnswer={(key, v) => patch({ legalityAnswers: { ...values.legalityAnswers, [key]: v } })}
            onNotesChange={(v) => patch({ legalityNotes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(4)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 4 && (
          <SectionQuestionsBlock
            index={4}
            title={`Kondisi Fisik ${label}`}
            listLabel="Daftar Pertanyaan Verifikasi"
            description={[
              `Verifikasi dilakukan untuk memastikan bahwa kondisi fisik ${label.toLowerCase()} layak digunakan untuk kegiatan ${
                kind === "GUDANG" ? "penyimpanan barang" : "produksi"
              } serta mendukung kegiatan operasional perusahaan.`,
              `Surveyor melakukan observasi langsung terhadap kondisi bangunan dan fasilitas ${label.toLowerCase()}.`,
            ]}
            questions={SECTION4_QUESTIONS[kind]}
            answers={values.section4Answers}
            notes={values.section4Notes ?? ""}
            notesPlaceholder={`Contoh: Kondisi ${label.toLowerCase()} secara umum baik dan dapat digunakan untuk kegiatan ${kind === "GUDANG" ? "penyimpanan barang" : "produksi"}.`}
            onAnswer={(key, v) => patch({ section4Answers: { ...values.section4Answers, [key]: v } })}
            onNotesChange={(v) => patch({ section4Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(hasCapacity ? 5 : idxActivity)}
            isSaving={saveMutation.isPending}
          />
        )}
        {hasCapacity && openStep === 5 && (
          <SectionCapacity
            capacity={values.capacity}
            layoutPath={values.capacityLayoutPath}
            answers={values.capacityAnswers}
            onCapacityChange={(patchValue) => patch({ capacity: { ...values.capacity, ...patchValue } })}
            onLayoutPathChange={(path) => patch({ capacityLayoutPath: path })}
            onAnswer={(key, v) => patch({ capacityAnswers: { ...values.capacityAnswers, [key]: v } })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(idxActivity)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === idxActivity && (
          <SectionQuestionsBlock
            index={idxActivity}
            title={`Aktivitas Operasional ${label}`}
            listLabel="Daftar Pertanyaan Verifikasi"
            description={[
              `Verifikasi dilakukan untuk memastikan bahwa ${label.toLowerCase()} digunakan secara aktif untuk kegiatan ${
                kind === "GUDANG" ? "penyimpanan dan pengelolaan barang" : "produksi"
              } perusahaan. Surveyor melakukan observasi terhadap aktivitas yang berlangsung di ${label.toLowerCase()} pada saat verifikasi dilakukan.`,
            ]}
            questions={SECTION6_QUESTIONS[kind]}
            answers={values.section6Answers}
            notes={values.section6Notes ?? ""}
            notesPlaceholder={`Tambahkan observasi tambahan terkait aktivitas operasional ${label.toLowerCase()} yang ditemukan saat verifikasi.`}
            onAnswer={(key, v) => patch({ section6Answers: { ...values.section6Answers, [key]: v } })}
            onNotesChange={(v) => patch({ section6Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(idxDocumentation)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === idxDocumentation && (
          <SectionDocumentation
            kind={kind}
            index={idxDocumentation}
            documentation={values.documentation}
            onChange={(key, docPatch) => patch({ documentation: { ...values.documentation, [key]: { ...values.documentation[key], ...docPatch } } })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(idxFindings)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === idxFindings && (
          <SectionFindings
            index={idxFindings}
            rangeText={rangeText}
            findings={findings}
            explanation={values.findingsExplanation ?? ""}
            impact={values.findingsImpact}
            recommendation={values.findingsRecommendation ?? ""}
            onExplanationChange={(v) => patch({ findingsExplanation: v })}
            onImpactChange={(v) => patch({ findingsImpact: v })}
            onRecommendationChange={(v) => patch({ findingsRecommendation: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(idxConclusion)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === idxConclusion && (
          <SectionConclusion
            kind={kind}
            index={idxConclusion}
            status={values.conclusionStatus}
            recommendation={values.conclusionRecommendation}
            summary={values.conclusionSummary ?? ""}
            onStatusChange={(v) => patch({ conclusionStatus: v })}
            onRecommendationChange={(v) => patch({ conclusionRecommendation: v })}
            onSummaryChange={(v) => patch({ conclusionSummary: v })}
            onSave={() => saveMutation.mutate(values)}
            onSubmit={() => setShowSubmitConfirm(true)}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1c2530]/50">
          <div className="w-[90%] max-w-[420px] rounded-[14px] bg-white p-7 shadow-2xl">
            <div className="mb-3.5 flex items-center gap-2.5">
              <MaterialIcon name="warning" className="text-2xl text-[#e0662e]" />
              <div className="text-[17px] font-extrabold">Konfirmasi Submit Verifikasi</div>
            </div>
            <div className="mb-[22px] text-[13.5px] leading-relaxed text-[#4a5568]">
              Apakah Anda yakin ingin mengirimkan hasil verifikasi lokasi {label.toLowerCase()} ini? Setelah dikirim,
              data tidak dapat diubah kembali.
            </div>
            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowSubmitConfirm(false)} className="rounded-[9px] border border-[#d7dbe0] bg-white px-[18px] py-2.5 text-[13px] font-bold text-[#1c2530]">
                Batal
              </button>
              <button
                type="button"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
                className="rounded-[9px] bg-[#e0662e] px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {submitMutation.isPending ? "Mengirim..." : "Ya, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FieldVerificationSidebar kind={kind} sectionTitles={titles} kinds={kinds} onSaveDraft={() => saveMutation.mutate(values)} isSaving={saveMutation.isPending || isCompleted} />
    </div>
  );
}
