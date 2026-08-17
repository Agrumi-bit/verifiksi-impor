import type { Metadata } from "next";

import { LoginSlidesPage } from "@/modules/system-configuration/components/login-slides-page";

export const metadata: Metadata = {
  title: "Login Page Content — Verifikasi Impor",
};

export default function LoginPageContentPage() {
  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Login Page Content</div>
        <p className="mt-1 text-[13px] text-[#8a7565]">Manage promotional content displayed on the login page.</p>
      </div>
      <LoginSlidesPage />
    </div>
  );
}
