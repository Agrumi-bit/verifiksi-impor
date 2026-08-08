"use client";

import { X } from "lucide-react";

type LetterStatus = "DRAFT" | "PENDING" | "APPROVED";

const LETTER_STATUS_LABEL: Record<LetterStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Draft", bg: "#f2ece5", color: "#6b5b4c" },
  PENDING: { label: "Menunggu Persetujuan PM", bg: "#fdf0d5", color: "#a3690a" },
  APPROVED: { label: "Disetujui PM", bg: "#e5f6ec", color: "#1f8a4c" },
};

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type Props = {
  roleLabel: string;
  personName: string;
  date: string | null;
  letterNumber: string | null;
  letterStatus: string;
  companyName: string;
  applicationNumber: string;
  onClose: () => void;
};

/** Read-only Surat Tugas preview for the verifikator-workspace Team tab — mirrors the paper-letter layout from Customer Relation Workspace's SuratTugasModal, minus the approval-workflow actions (verifikator has no authority over that lifecycle, view/print only). */
export function SuratTugasViewModal({ roleLabel, personName, date, letterNumber, letterStatus, companyName, applicationNumber, onClose }: Props) {
  const status = (letterStatus in LETTER_STATUS_LABEL ? letterStatus : "DRAFT") as LetterStatus;
  const letter = LETTER_STATUS_LABEL[status];
  const isApproved = status === "APPROVED";

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
            <div className="mb-5 text-center">
              <div className="text-[13px] font-extrabold tracking-[0.03em]">LEMBAGA VERIFIKASI INDUSTRI</div>
              <div className="text-[11px] text-[#8a7565]">Direktorat Verifikasi &amp; Kepatuhan</div>
              <div className="mt-2 border-b-2 border-[#20180f]" />
            </div>
            <div className="mb-1 text-center text-[14px] font-extrabold underline">SURAT TUGAS</div>
            <div className="mb-5 text-center text-[11.5px]">Nomor: {letterNumber ?? "—"}</div>
            <div className="mb-3.5">Yang bertanda tangan di bawah ini, dengan ini menugaskan:</div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">Nama</td>
                  <td className="align-top">: {personName}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">Peran</td>
                  <td className="align-top">: {roleLabel}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-3.5">Untuk melaksanakan {roleLabel} pada:</div>
            <table className="mb-3.5 w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-32.5 py-0.5 align-top">Perusahaan</td>
                  <td className="align-top">: {companyName}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">ID Aplikasi</td>
                  <td className="align-top">: {applicationNumber}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">Tanggal Pelaksanaan</td>
                  <td className="align-top">: {fmtDate(date)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-3.5">Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</div>
            {!isApproved && (
              <div className="mb-5 rounded-md border border-[#e8d29a] bg-[#fdf0d5] p-2.5 text-[11px] text-[#8a6a2f]">
                Dokumen ini masih berupa draft dan menunggu persetujuan Project Manager sebelum berlaku resmi.
              </div>
            )}
            <div className="text-right">
              <div>Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="h-12.5" />
              <div className="font-bold">Customer Relation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
