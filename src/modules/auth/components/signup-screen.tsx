"use client";

import { SignupForm } from "./signup-form";
import { LoginPromoPanel } from "./login-promo-panel";

export function SignupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 lg:p-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-background shadow-xl lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <SignupForm />
        </div>
        <div className="hidden lg:block">
          <LoginPromoPanel />
        </div>
      </div>
    </div>
  );
}
