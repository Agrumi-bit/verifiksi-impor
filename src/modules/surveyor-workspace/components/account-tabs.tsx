"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { authClient, useSession } from "@/lib/auth-client";

const TAB_NAMES = ["Profile", "Security", "Password", "Login History"] as const;
type TabName = (typeof TAB_NAMES)[number];

const profileSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

type SessionItem = {
  id: string;
  token: string;
  createdAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AssignmentStats = { total: number; assigned: number; inProgress: number; urgent: number };
type ReportListItem = { needsRevision: boolean };

function initialsFromName(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-semibold text-[#594138]">
        {label}
        {required && <span className="text-[#ba1a1a]"> *</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11px] text-[#a68f80]">{hint}</span>}
      {error && <span className="text-[11px] text-[#ba1a1a]">{error}</span>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#f0ded0] bg-[#fdf9f6] px-3.5 py-2.5 text-[13px] text-[#2b2420] outline-none focus:border-[#e0662e] disabled:text-[#a68f80]";

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#f0ded0] bg-white p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <MaterialIcon name={icon} className="text-[#e0662e]" />
        <h3 className="text-[15px] font-bold text-[#2b2420]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ProfileTab() {
  const { data: session, refetch } = useSession();
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (session?.user) {
      form.reset({ name: session.user.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function onSubmit(values: ProfileValues) {
    const { error } = await authClient.updateUser({ name: values.name });
    if (error) {
      toast.error(error.message ?? "Gagal menyimpan profil");
      return;
    }
    toast.success("Profil berhasil disimpan.");
    refetch();
  }

  if (!session) return <p className="text-sm text-[#8a7565]">Memuat...</p>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <SectionCard title="Informasi Profil" icon="badge">
        <div className="flex flex-col gap-4">
          <Field label="Nama Lengkap" htmlFor="name" required error={form.formState.errors.name?.message}>
            <input id="name" className={inputClass} {...form.register("name")} />
          </Field>
          <Field label="Email">
            <input value={session.user.email} disabled className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role">
              <div>
                <span className="inline-flex rounded-full bg-[#fdeadd] px-3 py-1.5 text-[12px] font-bold text-[#d9531f]">
                  {(session.user as { role?: string }).role ?? "SURVEYOR"}
                </span>
              </div>
            </Field>
            <Field label="Bergabung Sejak">
              <div className="flex items-center gap-1.5 py-1 text-[13px] text-[#2b2420]">
                <MaterialIcon name="event" className="text-[15px] text-[#a68f80]" />
                {fmtDate(session.user.createdAt)}
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="self-start rounded-lg bg-[#e0662e] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
      </button>
    </form>
  );
}

function SecurityTab() {
  const { data: session } = useSession();
  const [isRevoking, setIsRevoking] = useState(false);

  async function handleRevokeOthers() {
    setIsRevoking(true);
    const { error } = await authClient.revokeOtherSessions();
    setIsRevoking(false);
    if (error) {
      toast.error(error.message ?? "Gagal keluar dari perangkat lain");
      return;
    }
    toast.success("Berhasil keluar dari semua perangkat lain.");
  }

  if (!session) return <p className="text-sm text-[#8a7565]">Memuat...</p>;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Status Keamanan" icon="verified_user">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#8a7565]">Verifikasi Email</span>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold"
              style={
                session.user.emailVerified
                  ? { background: "#e2f7ea", color: "#027a48" }
                  : { background: "#fdedd6", color: "#c1440e" }
              }
            >
              {session.user.emailVerified ? "Terverifikasi" : "Belum Terverifikasi"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-[#f5ebe1] pt-3 text-[13px]">
            <span className="text-[#8a7565]">Akun Dibuat</span>
            <span className="font-semibold text-[#2b2420]">{fmtDate(session.user.createdAt)}</span>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Sesi Aktif" icon="devices">
        <p className="mb-3 text-[13px] text-[#8a7565]">
          Keluar dari semua perangkat lain selain perangkat yang sedang Anda gunakan.
        </p>
        <button
          type="button"
          disabled={isRevoking}
          onClick={handleRevokeOthers}
          className="flex items-center gap-2 self-start rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#2b2420] disabled:opacity-60"
        >
          <MaterialIcon name="logout" className="text-[16px]" />
          {isRevoking ? "Memproses..." : "Sign Out Other Devices"}
        </button>
      </SectionCard>
    </div>
  );
}

function PasswordTab() {
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordValues) {
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error(error.message ?? "Gagal mengubah password");
      return;
    }
    toast.success("Password berhasil diubah.");
    form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <SectionCard title="Ubah Password" icon="lock">
        <div className="flex flex-col gap-4">
          <Field
            label="Password Saat Ini"
            htmlFor="currentPassword"
            required
            error={form.formState.errors.currentPassword?.message}
          >
            <input id="currentPassword" type="password" className={inputClass} {...form.register("currentPassword")} />
          </Field>
          <Field
            label="Password Baru"
            htmlFor="newPassword"
            required
            error={form.formState.errors.newPassword?.message}
            hint="Minimal 8 karakter."
          >
            <input id="newPassword" type="password" className={inputClass} {...form.register("newPassword")} />
          </Field>
          <Field
            label="Konfirmasi Password Baru"
            htmlFor="confirmPassword"
            required
            error={form.formState.errors.confirmPassword?.message}
          >
            <input id="confirmPassword" type="password" className={inputClass} {...form.register("confirmPassword")} />
          </Field>
        </div>
      </SectionCard>
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="self-start rounded-lg bg-[#e0662e] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {form.formState.isSubmitting ? "Menyimpan..." : "Update Password"}
      </button>
    </form>
  );
}

function LoginHistoryTab() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authClient.listSessions().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        toast.error(error.message ?? "Gagal memuat login history");
      } else {
        setSessions((data as SessionItem[] | null) ?? []);
      }
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleRevoke(token: string) {
    setRevokingToken(token);
    const { error } = await authClient.revokeSession({ token });
    setRevokingToken(null);
    if (error) {
      toast.error(error.message ?? "Gagal mengakhiri sesi");
      return;
    }
    setSessions((current) => current?.filter((item) => item.token !== token) ?? null);
    toast.success("Sesi berhasil diakhiri.");
  }

  return (
    <SectionCard title="Riwayat Login" icon="history">
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <p className="text-[13px] text-[#8a7565]">Memuat...</p>
        ) : sessions && sessions.length > 0 ? (
          sessions.map((item) => {
            const isCurrent = item.token === session?.session.token;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#f0ded0] p-3.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-[#2b2420]">
                    <MaterialIcon name="lan" className="text-[15px] text-[#a68f80]" />
                    {item.ipAddress ?? "IP tidak diketahui"}
                    {isCurrent && (
                      <span className="rounded-full bg-[#e2f7ea] px-2 py-0.5 text-[10px] font-bold text-[#027a48]">
                        Sesi Ini
                      </span>
                    )}
                  </span>
                  <span className="truncate pl-[23px] text-[11.5px] text-[#8a7565]">
                    {item.userAgent ?? "User agent tidak diketahui"}
                  </span>
                  <span className="pl-[23px] text-[11.5px] text-[#a68f80]">{fmtDateTime(item.createdAt)}</span>
                </div>
                {!isCurrent && (
                  <button
                    type="button"
                    disabled={revokingToken === item.token}
                    onClick={() => handleRevoke(item.token)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-[#ba1a1a] hover:bg-[#fbe2e0] disabled:opacity-60"
                  >
                    <MaterialIcon name="delete" className="text-[15px]" />
                    Revoke
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-[13px] text-[#8a7565]">Tidak ada riwayat login.</p>
        )}
      </div>
    </SectionCard>
  );
}

function StatCard({ label, value, icon, valueClassName, iconWrapClassName }: {
  label: string;
  value: number;
  icon: string;
  valueClassName?: string;
  iconWrapClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{label}</p>
        <h3 className={`mt-0.5 text-2xl font-extrabold text-[#2b2420] ${valueClassName ?? ""}`}>
          {String(value).padStart(2, "0")}
        </h3>
      </div>
      <div className={`flex size-[34px] items-center justify-center rounded-lg text-base ${iconWrapClassName ?? "bg-[#f5ebe1]"}`}>
        <MaterialIcon name={icon} />
      </div>
    </div>
  );
}

export function AccountTabs() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabName>("Profile");

  const { data: assignmentsData } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", { pageSize: 1 }],
    queryFn: async () => {
      const response = await fetch("/api/surveyor-workspace/assignments?pageSize=1");
      if (!response.ok) throw new Error("Gagal memuat data penugasan");
      return (await response.json()) as { stats: AssignmentStats };
    },
  });

  const { data: reportsData } = useQuery({
    queryKey: ["surveyor-workspace", "reports"],
    queryFn: async () => {
      const response = await fetch("/api/surveyor-workspace/reports");
      if (!response.ok) throw new Error("Gagal memuat data report");
      return (await response.json()) as { data: ReportListItem[] };
    },
  });

  const assignmentStats = assignmentsData?.stats ?? { total: 0, assigned: 0, inProgress: 0, urgent: 0 };
  const reportStats = useMemo(() => {
    const reports = reportsData?.data ?? [];
    return { ok: reports.filter((r) => !r.needsRevision).length, issue: reports.filter((r) => r.needsRevision).length };
  }, [reportsData]);

  const initials = initialsFromName(session?.user.name);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "SURVEYOR";

  return (
    <div className="p-7">
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-[14px] border border-[#f0ded0] bg-white p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#e0662e] text-xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[19px] font-extrabold text-[#2b2420]">{session?.user.name ?? "…"}</h1>
            <span className="rounded-full bg-[#fdeadd] px-2.5 py-1 text-[11px] font-bold text-[#d9531f]">{role}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#8a7565]">
            <span className="flex items-center gap-1.5">
              <MaterialIcon name="mail" className="text-[15px] text-[#a68f80]" />
              {session?.user.email ?? "—"}
            </span>
            {session?.user.createdAt && (
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="event" className="text-[15px] text-[#a68f80]" />
                Bergabung {fmtDate(session.user.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL ASSIGNMENTS" value={assignmentStats.total} icon="assignment" iconWrapClassName="bg-[#f5ebe1]" />
        <StatCard
          label="IN PROGRESS"
          value={assignmentStats.inProgress}
          icon="schedule"
          iconWrapClassName="bg-[#fdeadd]"
          valueClassName="text-[#d9531f]"
        />
        <StatCard
          label="REPORT SELESAI"
          value={reportStats.ok}
          icon="check_circle"
          valueClassName="text-[#027a48]"
          iconWrapClassName="bg-[#e2f7ea]"
        />
        <StatCard
          label="ADA KETIDAKSESUAIAN"
          value={reportStats.issue}
          icon="error"
          valueClassName="text-[#ba1a1a]"
          iconWrapClassName="bg-[#fbe2e0]"
        />
      </div>

      <div className="mb-5 flex w-max min-w-full gap-0.5 rounded-full bg-[#e9e6e3] p-[5px] sm:w-fit sm:min-w-0">
        {TAB_NAMES.map((name) => {
          const isActive = activeTab === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setActiveTab(name)}
              className={
                "whitespace-nowrap rounded-full px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors " +
                (isActive ? "bg-white text-[#261813] shadow-sm" : "text-[#4a4038]")
              }
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl">
        {activeTab === "Profile" && <ProfileTab />}
        {activeTab === "Security" && <SecurityTab />}
        {activeTab === "Password" && <PasswordTab />}
        {activeTab === "Login History" && <LoginHistoryTab />}
      </div>
    </div>
  );
}
