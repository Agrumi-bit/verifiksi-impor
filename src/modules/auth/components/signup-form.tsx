"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { authClient } from "@/lib/auth-client";
import { useBranding, BRANDING_LOGO_URL } from "@/modules/branding/use-branding";
import { signupSchema, type SignupValues } from "../schema";

export function SignupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: branding } = useBranding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupValues) {
    setIsSubmitting(true);
    setServerError(null);

    const signupResponse = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      }),
    });

    if (!signupResponse.ok) {
      const body = await signupResponse.json().catch(() => null);
      setServerError(body?.error ?? "Gagal membuat akun. Coba lagi.");
      setIsSubmitting(false);
      return;
    }

    // Account created but not yet signed in — sign in with the same credentials to
    // establish a session, same as the login form, then land on the onboarding step
    // that links this account to the company's record (proxy.ts sends PERUSAHAAN
    // accounts without a companyId there automatically).
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      setServerError("Akun berhasil dibuat, tapi login otomatis gagal. Silakan login manual.");
      router.push("/login");
      return;
    }

    router.push("/company-workspace/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {branding?.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BRANDING_LOGO_URL} alt={branding.appName} className="size-10 rounded-full object-cover" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
        )}
        <h1 className="text-lg font-semibold">{branding?.appName ?? "VKI & VIU Platform"}</h1>
        <p className="text-sm text-muted-foreground">Daftar sebagai Perusahaan</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-xl border border-border p-6"
      >
        <h2 className="text-sm font-semibold">Sign Up</h2>
        <p className="text-xs text-muted-foreground">
          Buat akun untuk mengajukan permohonan VKI/VIU perusahaan Anda. Setelah akun dibuat, Anda
          akan diminta menghubungkan akun ini ke data perusahaan.
        </p>

        <FormField label="Nama" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" placeholder="Nama lengkap" {...register("name")} />
        </FormField>

        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="nama@perusahaan.co.id"
            {...register("email")}
          />
        </FormField>

        <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              className="pr-9"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>

        <FormField
          label="Konfirmasi Password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Ulangi password"
            {...register("confirmPassword")}
          />
        </FormField>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Memproses..." : "Sign Up"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Sudah punya akun?{" "}
          <a href="/login" className="font-semibold text-foreground hover:underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
