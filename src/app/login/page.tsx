import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login — VKI & VIU Platform",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
