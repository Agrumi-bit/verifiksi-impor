"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { authClient } from "@/lib/auth-client";
import { ROLE_HOME, WORKSPACE_ACCESS, ADMIN_ONLY_ROLES } from "@/modules/users/workspace-routes";
import type { Role } from "@/modules/users/roles";
import { useBranding, BRANDING_LOGO_URL } from "@/modules/branding/use-branding";
import { loginSchema, type LoginValues } from "../schema";

/** A logged-in-as role is only allowed to land where `src/proxy.ts` will actually let them stay — prevents an `?redirect=` param from sending a user somewhere proxy immediately bounces them back out of. */
function isAllowedForRole(pathname: string, role: Role): boolean {
  const workspace = WORKSPACE_ACCESS.find((w) => pathname === w.prefix || pathname.startsWith(`${w.prefix}/`));
  if (workspace) return workspace.roles.includes(role);
  if (pathname === "/login" || pathname === "/no-workspace") return true;
  return ADMIN_ONLY_ROLES.includes(role);
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: branding } = useBranding();

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

    const role = (data?.user as { role?: string } | undefined)?.role as Role | undefined;
    const defaultRedirect = role ? ROLE_HOME[role] : "/login";
    const explicitRedirect = searchParams.get("redirect");
    const target = explicitRedirect && role && isAllowedForRole(explicitRedirect, role) ? explicitRedirect : defaultRedirect;

    router.push(target);
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
        <p className="text-sm text-muted-foreground">
          {branding?.appSubtitle ?? "Sistem Verifikasi Kemampuan Industri & Verifikasi Importir Umum"}
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
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
