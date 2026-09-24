"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginValues } from "../schema";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setIsSubmitting(true);
    setServerError(null);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);

    if (error) {
      setServerError(
        error.message ?? "Email atau password salah. Silakan coba lagi.",
      );
      return;
    }

    const explicitRedirect = searchParams.get("redirect");
    const role = (data?.user as { role?: string } | undefined)?.role;
    const defaultRedirect =
      role === "PERUSAHAAN"
        ? "/company-workspace"
        : role === "SURVEYOR"
          ? "/surveyor-workspace"
          : role === "VERIFIKATOR"
            ? "/verifikator-workspace"
            : role === "CUSTOMER_RELATIONSHIP"
              ? "/customer-relation-workspace"
              : "/";

    router.push(explicitRedirect ?? defaultRedirect);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">VKI &amp; VIU Platform</h1>
        <p className="text-sm text-muted-foreground">
          Sistem Verifikasi Kemampuan Industri &amp; Verifikasi Importir Umum
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-xl border border-border p-6"
      >
        <h2 className="text-sm font-semibold">Login</h2>
        <p className="text-xs text-muted-foreground">
          Masukkan email dan password Anda untuk mengakses akun.
        </p>

        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="nama@perusahaan.co.id"
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            placeholder="Masukkan password"
            {...register("password")}
          />
        </FormField>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Memproses..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
