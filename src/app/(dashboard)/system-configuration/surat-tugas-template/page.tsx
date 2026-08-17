import type { Metadata } from "next";

import { SuratTugasTemplateForm } from "@/modules/system-configuration/components/surat-tugas-template-form";

export const metadata: Metadata = {
  title: "Template Surat Tugas — Verifikasi Impor",
};

export default function SuratTugasTemplatePage() {
  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Template Surat Tugas</div>
        <p className="mt-1 text-[13px] text-[#8a7565]">Atur teks yang tampil pada dokumen Surat Tugas.</p>
      </div>
      <SuratTugasTemplateForm />
    </div>
  );
}
