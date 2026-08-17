import type { Metadata } from "next";

import { BrandingForm } from "@/modules/system-configuration/components/branding-form";

export const metadata: Metadata = {
  title: "Branding — Verifikasi Impor",
};

export default function BrandingPage() {
  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Branding</div>
        <p className="mt-1 text-[13px] text-[#8a7565]">Atur nama, logo, dan warna tema aplikasi.</p>
      </div>
      <BrandingForm />
    </div>
  );
}
