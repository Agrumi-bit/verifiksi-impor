import type { CaseSummary } from "../../case-detail";
import { Field, StageCard } from "./stage-ui";

/**
 * Tahap 1 "Ringkasan — Informasi Permohonan" after the Verifikator design, read only: the design's
 * Edit / Simpan controls are left out, every value is shown as the applicant submitted it.
 */
export function SummaryStage({ data }: { data: CaseSummary }) {
  return (
    <StageCard title="Informasi Permohonan" description="Data dasar permohonan VIU seperti yang diajukan pemohon.">
      <div className="grid gap-x-12 gap-y-4 border-t border-[#EEF2F6] px-6 py-5 md:grid-cols-2">
        <Field label="Nomor Permohonan"><span className="font-mono">{data.applicationNumber}</span></Field>
        <Field label="Tanggal Permohonan">{data.submittedAt}</Field>
        <Field label="Jenis VIU">{data.jenis}</Field>
        <Field label="Jenis Permohonan">{data.category}</Field>
        <Field label="Status">{data.status}</Field>
        <Field label="Nama Pemohon">{data.companyName}</Field>
        <Field label="NIB"><span className="font-mono">{data.nib}</span></Field>
        <Field label="PIC">{data.pic}</Field>
        <Field label="Nomor Telepon">{data.phone}</Field>
        <Field label="Email">{data.email}</Field>
      </div>
    </StageCard>
  );
}
