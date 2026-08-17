"use client";

import { MaterialIcon } from "../material-icon";
import { SCHEDULE_TYPE_DEFS, type ScheduleType } from "@/modules/customer-relation-workspace/status";
import { LETTER_STATUS_BADGE, LETTER_STATUS_LABELS } from "../../status";
import { useSuratTugasTemplate } from "@/modules/surat-tugas-template/use-template";

type LetterInfo = {
  letterNumber: string | null;
  letterStatus: string;
  location: string | null;
  scheduledDate: string | null;
};

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

type Props = {
  scheduleType: ScheduleType;
  personName: string | null;
  companyName: string;
  applicationNumber: string;
  letter: LetterInfo;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  rejecting: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  saving: boolean;
};

export function SuratTugasView({
  scheduleType,
  personName,
  companyName,
  applicationNumber,
  letter,
  onClose,
  onApprove,
  onReject,
  rejecting,
  note,
  onNoteChange,
  onCancelReject,
  onConfirmReject,
  saving,
}: Props) {
  const { data: template } = useSuratTugasTemplate();
  const def = SCHEDULE_TYPE_DEFS[scheduleType];
  const isApproved = letter.letterStatus === "APPROVED";
  const badge = LETTER_STATUS_BADGE[letter.letterStatus] ?? LETTER_STATUS_BADGE.DRAFT;
  const label = LETTER_STATUS_LABELS[letter.letterStatus] ?? letter.letterStatus;

  return (
    <div onClick={onClose} className="fixed inset-0 z-22 flex items-center justify-center bg-[rgba(20,12,8,.6)]">
      <div onClick={(event) => event.stopPropagation()} className="flex max-h-[88vh] w-140 max-w-[92vw] flex-col overflow-hidden rounded-[10px] bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ded0] px-4.5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="text-[13.5px] font-extrabold text-[#20180f]">Surat Tugas</div>
            <span className={`rounded-md px-2.25 py-0.75 text-[10.5px] font-bold ${badge}`}>{label}</span>
          </div>
          <div className="flex items-center gap-2.5">
            {!isApproved && !rejecting && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onApprove}
                  className="rounded-md bg-[#1a9850] px-3.5 py-1.75 text-[12px] font-bold text-white disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onReject}
                  className="rounded-md border border-[#e15241] px-3.5 py-1.75 text-[12px] font-bold text-[#e15241] disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            )}
            {isApproved && (
              <button type="button" onClick={() => window.print()} className="rounded-md bg-[#e0662e] px-3.5 py-1.75 text-[12px] font-bold text-white">
                Cetak
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        {rejecting && (
          <div className="shrink-0 border-b border-[#f0ded0] bg-[#fbf8f4] p-3.5">
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Jelaskan alasan penolakan Surat Tugas..."
              rows={2}
              className="w-full rounded-lg border border-[#e8b1a3] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onCancelReject} className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813]">
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onConfirmReject}
                className="rounded-lg bg-[#e15241] px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Konfirmasi Reject"}
              </button>
            </div>
          </div>
        )}

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
              {template?.nomorLabel ?? "Nomor"}: {letter.letterNumber ?? "—"}
            </div>
            <div className="mb-3.5">
              {template?.openingSentence ?? "Yang bertanda tangan di bawah ini, Customer Relation Workspace, dengan ini menugaskan:"}
            </div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">{template?.namaLabel ?? "Nama"}</td>
                  <td className="align-top">: {personName ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">{template?.peranLabel ?? "Peran"}</td>
                  <td className="align-top">: {def.label}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-3.5">
              {template?.assignmentPrefix ?? "Untuk melaksanakan"} {def.label}
              {letter.location ? ` (${letter.location})` : ""} {template?.assignmentSuffix ?? "pada:"}
            </div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">{template?.perusahaanLabel ?? "Perusahaan"}</td>
                  <td className="align-top">: {companyName}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">{template?.idAplikasiLabel ?? "ID Aplikasi"}</td>
                  <td className="align-top">: {applicationNumber}</td>
                </tr>
                {letter.location && (
                  <tr>
                    <td className="py-0.5 align-top">{template?.fasilitasLabel ?? "Fasilitas"}</td>
                    <td className="align-top">: {letter.location}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-0.5 align-top">{template?.tanggalLabel ?? "Tanggal Pelaksanaan"}</td>
                  <td className="align-top">: {fmtDate(letter.scheduledDate)}</td>
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
