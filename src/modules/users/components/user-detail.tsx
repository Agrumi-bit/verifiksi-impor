"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  updateUserProfileSchema,
  resetPasswordSchema,
  type UpdateUserProfileValues,
  type ResetPasswordValues,
} from "../schema";
import { ROLES, ROLE_LABELS, type Role } from "../roles";

type UserDetailData = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: Role | null;
  emailVerified: boolean;
  banned: boolean | null;
  banReason: string | null;
  companyId: string | null;
  company: { companyName: string } | null;
  createdAt: string;
};

type CompanyOption = { id: string; companyName: string };

const inputClass =
  "w-full rounded-lg border-none bg-[#f7f2ec] px-3.5 py-2.75 text-[13px] text-[#20180f] outline-none placeholder:text-[#a68f80] disabled:opacity-50";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[13px] font-bold text-[#20180f]">
      {children} {required && <span className="text-[#e0662e]">*</span>}
    </div>
  );
}

type Props = { id: string };

export function UserDetail({ id }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error("Pengguna tidak ditemukan");
      const json = (await response.json()) as { data: UserDetailData };
      return json.data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", "options"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Gagal memuat daftar perusahaan");
      const json = (await response.json()) as { data: CompanyOption[] };
      return json.data;
    },
  });

  const profileForm = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
  });

  const passwordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!data) return;
    profileForm.reset({
      name: data.name,
      username: data.username ?? "",
      email: data.email,
      phone: data.phone ?? "",
      companyId: data.companyId ?? "",
      role: data.role ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const selectedRole = profileForm.watch("role");

  async function handleSaveProfile(values: UpdateUserProfileValues) {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan perubahan");
      return;
    }
    toast.success("Profil pengguna berhasil diperbarui.");
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["users", "detail", id] });
  }

  async function handleResetPassword(values: ResetPasswordValues) {
    setIsPasswordSubmitting(true);
    try {
      const response = await fetch(`/api/users/${id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal mereset password");
        return;
      }
      toast.success("Password berhasil direset.");
      passwordForm.reset({ newPassword: "", confirmPassword: "" });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    if (!data) return;
    const nextBanned = !data.banned;
    const confirmMessage = nextBanned
      ? `Suspend akun "${data.name}"? Pengguna tidak akan bisa login.`
      : `Aktifkan kembali akun "${data.name}"?`;
    if (!window.confirm(confirmMessage)) return;

    setIsStatusSubmitting(true);
    try {
      const response = await fetch(`/api/users/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: nextBanned }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal mengubah status pengguna");
        return;
      }
      toast.success(nextBanned ? "Akun disuspend." : "Akun diaktifkan kembali.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "detail", id] });
    } finally {
      setIsStatusSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#fbeee5] p-7">
        <p className="text-[13px] text-[#8a7565]">Memuat...</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-full bg-[#fbeee5] p-7">
        <p className="text-[13px] text-[#ba1a1a]">Data pengguna tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-190">
        <div className="mb-5 flex items-center gap-2.5">
          <button type="button" onClick={() => router.push("/user-management/users")} className="text-[20px] text-[#a68f80]">
            ←
          </button>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
              {(data.role && ROLE_LABELS[data.role]) || "Tanpa Role"}
            </div>
            <div className="text-[20px] font-extrabold text-[#2b2420]">{data.name}</div>
          </div>
          <span
            className="ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-bold"
            style={{
              background: data.banned ? "#fce8e6" : "#e2f7ea",
              color: data.banned ? "#ba1a1a" : "#1a7a4c",
            }}
          >
            {data.banned ? "Suspended" : "Aktif"}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <form
            onSubmit={profileForm.handleSubmit(handleSaveProfile)}
            className="rounded-[14px] border border-[#f0ded0] bg-white p-6"
          >
            <h2 className="mb-4 text-[15px] font-extrabold text-[#20180f]">Profil</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Nama</FieldLabel>
                <input className={inputClass} {...profileForm.register("name")} />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{profileForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <FieldLabel>Username</FieldLabel>
                <input className={inputClass} placeholder="mis. budi.tester" {...profileForm.register("username")} />
                {profileForm.formState.errors.username && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{profileForm.formState.errors.username.message}</p>
                )}
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <input type="email" className={inputClass} {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <FieldLabel>Telepon</FieldLabel>
                <input className={inputClass} placeholder="+62 812 3456 7890" {...profileForm.register("phone")} />
              </div>
            </div>

            <h2 className="mb-4 mt-6 text-[15px] font-extrabold text-[#20180f]">Role &amp; Perusahaan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Role</FieldLabel>
                <select className={inputClass} {...profileForm.register("role")}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Perusahaan</FieldLabel>
                <select
                  className={inputClass}
                  disabled={selectedRole !== "PERUSAHAAN"}
                  {...profileForm.register("companyId")}
                >
                  <option value="">— Tidak terhubung —</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
                {selectedRole !== "PERUSAHAAN" && (
                  <p className="mt-1 text-xs text-[#8a7565]">Hanya berlaku untuk role Perusahaan.</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="mt-6 rounded-lg bg-[#e0662e] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {profileForm.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>

          <form
            onSubmit={passwordForm.handleSubmit(handleResetPassword)}
            className="rounded-[14px] border border-[#f0ded0] bg-white p-6"
          >
            <h2 className="text-[15px] font-extrabold text-[#20180f]">Keamanan</h2>
            <p className="mt-0.5 text-[12.5px] text-[#8a7565]">
              Reset password pengguna ini. Pengguna tidak akan diberi tahu otomatis — sampaikan password baru secara manual.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Password Baru</FieldLabel>
                <input type="password" className={inputClass} {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <FieldLabel required>Konfirmasi Password</FieldLabel>
                <input type="password" className={inputClass} {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-[#ba1a1a]">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="mt-4 rounded-lg border border-[#e1bfb3] bg-white px-5 py-2.5 text-[13px] font-bold text-[#261813] disabled:opacity-60"
            >
              {isPasswordSubmitting ? "Menyimpan..." : "Reset Password"}
            </button>
          </form>

          <div className="rounded-[14px] border border-[#f0ded0] bg-white p-6">
            <h2 className="text-[15px] font-extrabold text-[#20180f]">Status Akun</h2>
            <p className="mt-0.5 text-[12.5px] text-[#8a7565]">
              {data.banned
                ? `Akun ini sedang disuspend${data.banReason ? `: ${data.banReason}` : "."}`
                : "Akun aktif dan bisa login normal."}
            </p>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isStatusSubmitting}
              className="mt-4 rounded-lg px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: data.banned ? "#1a7a4c" : "#ba1a1a" }}
            >
              {data.banned ? "Aktifkan Akun" : "Suspend Akun"}
            </button>
          </div>

          <div className="rounded-[14px] border border-[#f0ded0] bg-white p-6">
            <h2 className="mb-4 text-[15px] font-extrabold text-[#20180f]">Info Akun</h2>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] text-[#8a7565]">Email Verified</div>
                <div className="mt-0.5 text-[13.5px] font-semibold text-[#20180f]">
                  {data.emailVerified ? "Terverifikasi" : "Belum Terverifikasi"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8a7565]">Terdaftar Sejak</div>
                <div className="mt-0.5 text-[13.5px] font-semibold text-[#20180f]">
                  {new Date(data.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
