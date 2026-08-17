import type { Metadata } from "next";

import { SmtpForm } from "@/modules/system-configuration/components/smtp-form";

export const metadata: Metadata = {
  title: "SMTP Email — Verifikasi Impor",
};

export default function SmtpSettingsPage() {
  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">SMTP Email</div>
        <p className="mt-1 text-[13px] text-[#8a7565]">Atur server SMTP yang dipakai aplikasi untuk mengirim email.</p>
      </div>
      <SmtpForm />
    </div>
  );
}
