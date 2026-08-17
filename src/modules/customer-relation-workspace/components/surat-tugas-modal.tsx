"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

import { SCHEDULE_TYPE_DEFS } from "../status";
import { useSuratTugasTemplate } from "@/modules/surat-tugas-template/use-template";

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

type Schedule = {
  id: string;
  scheduleType: "survey" | "dokumen" | "technical";
  facility: string | null;
  date: string | null;
  person: string;
  letterNumber: string | null;
  letterStatus: "DRAFT" | "PENDING" | "APPROVED";
};

type ApplicationSummary = { applicationNumber: string; company: string };

const LETTER_STATUS_LABEL: Record<Schedule["letterStatus"], { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Draft", bg: "#f2ece5", color: "#6b5b4c" },
  PENDING: { label: "Menunggu Persetujuan PM", bg: "#fdf0d5", color: "#a3690a" },
  APPROVED: { label: "Disetujui PM", bg: "#e5f6ec", color: "#1f8a4c" },
};

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  applicationId: string;
  schedule: Schedule;
  onClose: () => void;
  onChanged: () => void;
};

export function SuratTugasModal({ applicationId, schedule, onClose, onChanged }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: application } = useQuery({
    queryKey: ["customer-relation-workspace", "applications", "detail", applicationId],
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}`);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: ApplicationSummary };
      return json.data;
    },
  });

  const { data: template } = useSuratTugasTemplate();
  const def = SCHEDULE_TYPE_DEFS[schedule.scheduleType];
  const letter = LETTER_STATUS_LABEL[schedule.letterStatus];
  const isDraft = schedule.letterStatus === "DRAFT";
  const isApproved = schedule.letterStatus === "APPROVED";

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/customer-relation-workspace/applications/${applicationId}/schedules/${schedule.id}/submit-letter`,
        { method: "POST" },
      );
      if (!response.ok) {
        toast.error("Gagal mengajukan surat tugas");
        return;
      }
      toast.success("Surat Tugas diajukan untuk persetujuan Project Manager.");
      onChanged();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-22 flex items-center justify-center bg-[rgba(20,12,8,.6)]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-140 max-w-[92vw] flex-col overflow-hidden rounded-[10px] bg-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ded0] px-4.5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="text-[13.5px] font-extrabold text-[#20180f]">Surat Tugas</div>
            <span className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold" style={{ background: letter.bg, color: letter.color }}>
              {letter.label}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {isDraft && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-md bg-[#e0662e] px-3.5 py-1.75 text-[12px] font-bold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Mengajukan..." : "Ajukan ke Project Manager"}
              </button>
            )}
            {isApproved && (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md bg-[#e0662e] px-3.5 py-1.75 text-[12px] font-bold text-white"
              >
                Cetak
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-auto bg-[#efe6da] p-6">
          <div className="relative box-border w-110 max-w-full bg-white p-9 py-9 text-[12.5px] leading-relaxed text-[#20180f] shadow-[0_2px_10px_rgba(0,0,0,.15)]">
            {!isApproved && (
              <div className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-[52px] font-extrabold text-[rgba(193,54,31,.14)]">
                DRAFT
              </div>
            )}
            <div className="mb-3.5 flex items-start justify-between gap-4 border-b-2 border-[#20180f] pb-3">
              {template?.headerImagePath ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={fileHref(template.headerImagePath)} alt={template.orgName} className="max-h-16 object-contain" />
              ) : (
                <div>
                  <div className="text-[13px] font-extrabold tracking-[0.03em]">{template?.orgName ?? "PT Tribhakti Inspektama"}</div>
                  <div className="text-[10px] text-[#8a7565]">{template?.orgSubtitle ?? "Laboratory & Integrated Services"}</div>
                </div>
              )}
              {template && (template.docNumber || template.docRevision || template.docAmendment || template.docEffectiveDate) && (
                <table className="shrink-0 border-collapse text-[9.5px]">
                  <tbody>
                    {template.docNumber && (
                      <tr>
                        <td className="border border-[#e0662e] bg-[#e0662e] px-2 py-0.75 font-bold text-white">{template.docNumberLabel}</td>
                        <td className="border border-[#e8dccd] px-2 py-0.75">{template.docNumber}</td>
                      </tr>
                    )}
                    {template.docRevision && (
                      <tr>
                        <td className="border border-[#e0662e] bg-[#e0662e] px-2 py-0.75 font-bold text-white">{template.docRevisionLabel}</td>
                        <td className="border border-[#e8dccd] px-2 py-0.75">{template.docRevision}</td>
                      </tr>
                    )}
                    {template.docAmendment && (
                      <tr>
                        <td className="border border-[#e0662e] bg-[#e0662e] px-2 py-0.75 font-bold text-white">{template.docAmendmentLabel}</td>
                        <td className="border border-[#e8dccd] px-2 py-0.75">{template.docAmendment}</td>
                      </tr>
                    )}
                    {template.docEffectiveDate && (
                      <tr>
                        <td className="border border-[#e0662e] bg-[#e0662e] px-2 py-0.75 font-bold text-white">{template.docEffectiveLabel}</td>
                        <td className="border border-[#e8dccd] px-2 py-0.75">{template.docEffectiveDate}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mb-4 bg-[#20180f] px-3 py-1.5 text-center text-[12px] font-extrabold uppercase text-white">
              {template?.letterTitle ?? "SURAT TUGAS"}
            </div>
            <div className="mb-5 text-[11.5px]">
              {template?.nomorLabel ?? "Nomor"}: {schedule.letterNumber ?? "—"}
            </div>
            <div className="mb-3.5">
              {template?.openingSentence ?? "Yang bertanda tangan di bawah ini, Customer Relation Workspace, dengan ini menugaskan:"}
            </div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">{template?.namaLabel ?? "Nama"}</td>
                  <td className="align-top">: {schedule.person}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">{template?.peranLabel ?? "Peran"}</td>
                  <td className="align-top">: {def.label}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-3.5">
              {template?.assignmentPrefix ?? "Untuk melaksanakan"} {def.label}
              {schedule.facility ? ` (${schedule.facility})` : ""} {template?.assignmentSuffix ?? "pada:"}
            </div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">{template?.perusahaanLabel ?? "Perusahaan"}</td>
                  <td className="align-top">: {application?.company ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">{template?.idAplikasiLabel ?? "ID Aplikasi"}</td>
                  <td className="align-top">: {application?.applicationNumber ?? "—"}</td>
                </tr>
                {schedule.facility && (
                  <tr>
                    <td className="py-0.5 align-top">{template?.fasilitasLabel ?? "Fasilitas"}</td>
                    <td className="align-top">: {schedule.facility}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-0.5 align-top">{template?.tanggalLabel ?? "Tanggal Pelaksanaan"}</td>
                  <td className="align-top">: {fmtDate(schedule.date)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-3.5">
              {template?.closingSentence ?? "Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab."}
            </div>
            {!isApproved && (
              <div className="mb-5 rounded-md border border-[#e8d29a] bg-[#fdf0d5] p-2.5 text-[11px] text-[#8a6a2f]">
                {template?.draftNoticeText ?? "Dokumen ini masih berupa draft dan menunggu persetujuan Project Manager sebelum berlaku resmi."}
              </div>
            )}
            {template?.footerImagePath ? (
              <div className="text-right">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(template.footerImagePath)} alt={template.signerLabel} className="ml-auto max-h-24 object-contain" />
              </div>
            ) : (
              <div className="text-right">
                <div>
                  {template?.signatureCity ?? "Jakarta"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <div className="h-12.5" />
                <div className="font-bold">{template?.signerLabel ?? "Customer Relation"}</div>
              </div>
            )}
            {template?.confidentialityNotice && (
              <div className="mt-6 border-t border-[#f0ded0] pt-2.5 text-center text-[9px] italic text-[#a68f80]">
                {template.confidentialityNotice.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
