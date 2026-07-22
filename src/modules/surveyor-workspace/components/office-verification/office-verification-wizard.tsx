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
  emptyOfficeVerification,
  officeVerificationSchema,
  SECTION2_QUESTIONS,
  SECTION4_QUESTIONS,
  SECTION5_QUESTIONS,
  SECTION_TITLES,
  type DocCheckValues,
  type OfficeVerificationValues,
} from "./schema";
import { Section0Date } from "./section-0-date";
import { Section1Documents } from "./section-1-documents";
import { SectionQuestionsBlock } from "./section-questions-block";
import { Section3Ownership } from "./section-3-ownership";
import { Section6Documentation } from "./section-6-documentation";
import { Section7Findings } from "./section-7-findings";
import { Section8Conclusion } from "./section-8-conclusion";
import { Section9Review } from "./section-9-review";
import { OfficeVerificationSidebar } from "./sidebar";

type PayloadLocation = {
  buildingStatus?: "MILIK_SENDIRI" | "SEWA" | null;
  ownershipDocumentPath?: string | null;
  leaseDocumentPath?: string | null;
  leaseOriginalOwnerName?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  province?: string | null;
};

type LocationDetail = {
  id: string;
  status: LocationVisitStatusValue;
  locationType: string;
  address: string;
  city: string | null;
  officeVerification: OfficeVerificationValues | null;
  company: { companyName: string; nibDocumentPath: string | null; notarialDocumentPath: string | null };
  payloadLocation: PayloadLocation | null;
};

function buildDefaultSection1Docs(
  company: LocationDetail["company"],
  payloadLocation: PayloadLocation | null,
): DocCheckValues[] {
  const docs: DocCheckValues[] = [];
  if (company.nibDocumentPath) docs.push({ key: "nib", name: "NIB", status: "pending", addressText: "" });
  if (company.notarialDocumentPath) {
    docs.push({ key: "akta", name: "Akta Notaris", status: "pending", addressText: "" });
  }
  const isSewa = payloadLocation?.buildingStatus === "SEWA";
  const ownershipDocPath = isSewa ? payloadLocation?.leaseDocumentPath : payloadLocation?.ownershipDocumentPath;
  if (ownershipDocPath) {
    docs.push({
      key: "kepemilikan",
      name: isSewa ? "Dokumen Sewa Lokasi" : "Dokumen Kepemilikan Lokasi",
      status: "pending",
      addressText: "",
    });
  }
  return docs;
}

type Props = { assignmentId: string; locationId: string };

export function OfficeVerificationWizard({ assignmentId, locationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["surveyor-workspace", "assignments", assignmentId, "locations", locationId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`);
      if (!response.ok) throw new Error("Lokasi tidak ditemukan");
      const json = (await response.json()) as { data: LocationDetail };
      return json.data;
    },
  });

  const [values, setValues] = useState<OfficeVerificationValues>(emptyOfficeVerification());
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);

  if (data && data.id !== loadedForId) {
    setLoadedForId(data.id);
    setValues(
      data.officeVerification ?? {
        ...emptyOfficeVerification(),
        section1Docs: buildDefaultSection1Docs(data.company, data.payloadLocation),
      },
    );
  }

  const isCompleted = data?.status === "COMPLETED";

  function patch(partial: Partial<OfficeVerificationValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  const saveMutation = useMutation({
    mutationFn: async (next: OfficeVerificationValues) => {
      const response = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/office-verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(officeVerificationSchema.parse(next)),
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
      const saveResponse = await fetch(
        `/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}/office-verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(officeVerificationSchema.parse(values)),
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
        throw new Error(body?.error ?? "Gagal submit verifikasi kantor");
      }
      return response.json();
    },
    onSuccess: () => {
      setShowSubmitConfirm(false);
      toast.success("Verifikasi lokasi kantor berhasil disubmit.");
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
      router.push(`/surveyor-workspace/assignments/${assignmentId}/verify/${locationId}/report`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal submit verifikasi kantor");
    },
  });

  const buildingStatus = data?.payloadLocation?.buildingStatus ?? null;
  const kinds = useMemo(() => computeSectionKinds(values, buildingStatus), [values, buildingStatus]);
  const findings = useMemo(() => computeFindings(values), [values]);

  function saveAndGoTo(next: number | null) {
    saveMutation.mutate(values);
    setOpenStep(next);
  }

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

  const stepColor = (kind: (typeof kinds)[number]) =>
    kind === "issue" ? "#dc2626" : kind === "ok" ? "#16a34a" : "#e6b800";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-[#1c2530]">
      <div className="min-w-0 flex-1 overflow-y-auto p-8 sm:p-10">
        <Link
          href={`/surveyor-workspace/assignments/${assignmentId}`}
          className="mb-[22px] flex w-fit items-center gap-2 text-sm font-semibold text-[#1c2530]"
        >
          <MaterialIcon name="arrow_back" className="text-lg" />
          Back
        </Link>

        <h1 className="mb-3.5 text-[28px] font-extrabold">Verifikasi Lokasi Kantor</h1>
        <p className="mb-7 max-w-3xl text-[14.5px] leading-relaxed text-[#4a5568]">
          Verifikasi kantor dilakukan untuk memastikan bahwa kantor perusahaan yang tercantum dalam dokumen
          permohonan benar-benar ada dan sesuai dengan data yang diajukan. Proses verifikasi meliputi observasi
          langsung terhadap kondisi fisik kantor serta aktivitas operasional yang berlangsung di lokasi tersebut.
        </p>

        <div className="flex items-center justify-between gap-5 rounded-[14px] border-[1.5px] border-[#f26522] bg-white p-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex size-[68px] shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[#e4e8ee] bg-[#fff1ec] text-lg font-extrabold text-[#a63b00]">
              {data.company.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-semibold text-[#1c2530]">Kantor</span>
                <span className="whitespace-nowrap rounded-md bg-[#22c55e] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {LOCATION_VISIT_STATUS_LABELS[data.status]}
                </span>
                {buildingStatus && (
                  <span className="whitespace-nowrap rounded-md bg-[#e0662e] px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {buildingStatus === "SEWA" ? "Sewa" : "Milik Sendiri"}
                  </span>
                )}
              </div>
              <div className="mb-1 truncate text-[22px] font-extrabold leading-tight text-[#1c2530]">
                {data.company.companyName}
              </div>
              <div className="text-sm leading-tight text-[#4a5568]">
                {data.address}
                {data.city ? `, ${data.city}` : ""}
              </div>
            </div>
          </div>
          <MaterialIcon name="location_on" className="shrink-0 text-[44px] text-[#34a853]" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {[...SECTION_TITLES.map((_, i) => i), 9].map((n) => {
            const kind = n === 9 ? null : kinds[n];
            const active = openStep === n;
            return (
              <button
                type="button"
                key={n}
                onClick={() => setOpenStep(openStep === n ? null : n)}
                className="flex size-[38px] items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background: active ? "#3b82f6" : n === 9 ? "#4a5568" : stepColor(kind!),
                  border: `1.5px solid ${active ? "#3b82f6" : n === 9 ? "#4a5568" : stepColor(kind!)}`,
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {openStep === 0 && (
          <Section0Date
            values={values}
            onChange={patch}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(1)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 1 && (
          <Section1Documents
            docs={values.section1Docs}
            onChange={(key, docPatch) =>
              patch({
                section1Docs: values.section1Docs.map((d) => (d.key === key ? { ...d, ...docPatch } : d)),
              })
            }
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(2)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 2 && (
          <SectionQuestionsBlock
            index={2}
            title="Identifikasi Lokasi Kantor"
            listLabel="Pertanyaan Verifikasi"
            description={[
              "Verifikasi dilakukan untuk memastikan bahwa lokasi kantor yang tercantum dalam permohonan benar-benar sesuai dengan kondisi yang ditemukan di lapangan.",
              "Surveyor melakukan observasi langsung terhadap lokasi kantor dan memberikan penilaian terhadap setiap pertanyaan berikut.",
            ]}
            questions={SECTION2_QUESTIONS}
            answers={values.section2Answers}
            notes={values.section2Notes ?? ""}
            notesPlaceholder="Contoh: Lokasi kantor sesuai dengan alamat yang tercantum dalam permohonan dan terdapat papan nama perusahaan pada bagian depan bangunan."
            onAnswer={(key, v) => patch({ section2Answers: { ...values.section2Answers, [key]: v } })}
            onNotesChange={(v) => patch({ section2Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(3)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 3 && (
          <Section3Ownership
            buildingStatus={buildingStatus}
            payloadLocation={data.payloadLocation}
            ownershipAnswer={values.ownershipAnswer}
            sewaAnswers={values.sewaAnswers}
            notes={values.section3Notes ?? ""}
            onOwnershipAnswer={(v) => patch({ ownershipAnswer: v })}
            onSewaAnswer={(key, v) => patch({ sewaAnswers: { ...values.sewaAnswers, [key]: v } })}
            onNotesChange={(v) => patch({ section3Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(4)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 4 && (
          <SectionQuestionsBlock
            index={4}
            title="Keberadaan dan Kondisi Fisik Kantor"
            listLabel="Daftar Pertanyaan"
            description={[
              "Verifikasi dilakukan untuk memastikan bahwa kantor perusahaan memiliki kondisi fisik yang memadai dan dapat digunakan untuk kegiatan operasional perusahaan.",
              "Surveyor melakukan observasi langsung terhadap fasilitas kantor yang tersedia.",
            ]}
            questions={SECTION4_QUESTIONS}
            answers={values.section4Answers}
            notes={values.section4Notes ?? ""}
            notesPlaceholder="Contoh: Kantor memiliki fasilitas yang lengkap dan memadai untuk mendukung kegiatan operasional perusahaan sehari-hari."
            onAnswer={(key, v) => patch({ section4Answers: { ...values.section4Answers, [key]: v } })}
            onNotesChange={(v) => patch({ section4Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(5)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 5 && (
          <SectionQuestionsBlock
            index={5}
            title="Aktivitas Operasional Kantor"
            listLabel="Daftar Pertanyaan"
            description={[
              "Verifikasi dilakukan untuk memastikan bahwa kantor perusahaan digunakan secara aktif untuk kegiatan operasional perusahaan, termasuk kegiatan administrasi dan pengelolaan kegiatan usaha.",
              "Surveyor melakukan observasi langsung terhadap aktivitas yang berlangsung di kantor pada saat verifikasi dilakukan.",
            ]}
            questions={SECTION5_QUESTIONS}
            answers={values.section5Answers}
            notes={values.section5Notes ?? ""}
            notesPlaceholder="Contoh: Kantor beroperasi secara aktif dengan kegiatan administrasi yang berlangsung rutin dan dikelola oleh staf perusahaan."
            onAnswer={(key, v) => patch({ section5Answers: { ...values.section5Answers, [key]: v } })}
            onNotesChange={(v) => patch({ section5Notes: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(6)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 6 && (
          <Section6Documentation
            documentation={values.documentation}
            onChange={(key, docPatch) =>
              patch({ documentation: { ...values.documentation, [key]: { ...values.documentation[key], ...docPatch } } })
            }
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(7)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 7 && (
          <Section7Findings
            findings={findings}
            explanation={values.findingsExplanation ?? ""}
            impact={values.findingsImpact}
            recommendation={values.findingsRecommendation ?? ""}
            onExplanationChange={(v) => patch({ findingsExplanation: v })}
            onImpactChange={(v) => patch({ findingsImpact: v })}
            onRecommendationChange={(v) => patch({ findingsRecommendation: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(8)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 8 && (
          <Section8Conclusion
            status={values.conclusionStatus}
            recommendation={values.conclusionRecommendation}
            summary={values.conclusionSummary ?? ""}
            onStatusChange={(v) => patch({ conclusionStatus: v })}
            onRecommendationChange={(v) => patch({ conclusionRecommendation: v })}
            onSummaryChange={(v) => patch({ conclusionSummary: v })}
            onSave={() => saveMutation.mutate(values)}
            onSaveNext={() => saveAndGoTo(9)}
            isSaving={saveMutation.isPending}
          />
        )}
        {openStep === 9 && (
          <Section9Review
            kinds={kinds}
            onGoTo={(i) => setOpenStep(i)}
            onSave={() => saveMutation.mutate(values)}
            onOpenSubmitConfirm={() => setShowSubmitConfirm(true)}
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
              Apakah Anda yakin ingin mengirimkan hasil verifikasi lokasi kantor ini? Setelah dikirim, data tidak
              dapat diubah kembali.
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-[9px] border border-[#d7dbe0] bg-white px-[18px] py-2.5 text-[13px] font-bold text-[#1c2530]"
              >
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

      <OfficeVerificationSidebar kinds={kinds} onSaveDraft={() => saveMutation.mutate(values)} isSaving={saveMutation.isPending || isCompleted} />
    </div>
  );
}
