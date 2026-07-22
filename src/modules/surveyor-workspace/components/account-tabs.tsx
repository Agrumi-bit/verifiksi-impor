"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogOut, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { FormField } from "@/components/form/form-field";
import { authClient, useSession } from "@/lib/auth-client";

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

  if (!session) return <p className="text-sm text-muted-foreground">Memuat...</p>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Nama Lengkap"
            htmlFor="name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input id="name" {...form.register("name")} />
          </FormField>
          <FormField label="Email">
            <Input value={session.user.email} disabled />
          </FormField>
          <FormField label="Role">
            <div>
              <Badge>{(session.user as { role?: string }).role ?? "SURVEYOR"}</Badge>
            </div>
          </FormField>
        </CardContent>
      </Card>
      <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
        {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
      </Button>
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

  if (!session) return <p className="text-sm text-muted-foreground">Memuat...</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email Verification</span>
            <Badge variant={session.user.emailVerified ? "default" : "outline"}>
              {session.user.emailVerified ? "Terverifikasi" : "Belum Terverifikasi"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Akun Dibuat</span>
            <span className="font-medium">
              {new Date(session.user.createdAt).toLocaleDateString("id-ID")}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Keluar dari semua perangkat lain selain perangkat yang sedang Anda gunakan.
          </p>
          <Button
            variant="outline"
            className="self-start"
            disabled={isRevoking}
            onClick={handleRevokeOthers}
          >
            <LogOut className="size-4" />
            {isRevoking ? "Memproses..." : "Sign Out Other Devices"}
          </Button>
        </CardContent>
      </Card>
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Password Saat Ini"
            htmlFor="currentPassword"
            required
            error={form.formState.errors.currentPassword?.message}
          >
            <Input id="currentPassword" type="password" {...form.register("currentPassword")} />
          </FormField>
          <FormField
            label="Password Baru"
            htmlFor="newPassword"
            required
            error={form.formState.errors.newPassword?.message}
            hint="Minimal 8 karakter."
          >
            <Input id="newPassword" type="password" {...form.register("newPassword")} />
          </FormField>
          <FormField
            label="Konfirmasi Password Baru"
            htmlFor="confirmPassword"
            required
            error={form.formState.errors.confirmPassword?.message}
          >
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
          </FormField>
        </CardContent>
      </Card>
      <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
        {form.formState.isSubmitting ? "Menyimpan..." : "Update Password"}
      </Button>
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
    <Card>
      <CardHeader>
        <CardTitle>Login History</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : sessions && sessions.length > 0 ? (
          sessions.map((item) => {
            const isCurrent = item.token === session?.session.token;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    {item.ipAddress ?? "IP tidak diketahui"}
                    {isCurrent && <Badge variant="outline">Sesi Ini</Badge>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.userAgent ?? "User agent tidak diketahui"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokingToken === item.token}
                    onClick={() => handleRevoke(item.token)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Revoke
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada riwayat login.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountTabs() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Kelola profil dan keamanan akun Anda.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTab value="profile">Profile</TabsTab>
          <TabsTab value="security">Security</TabsTab>
          <TabsTab value="password">Password</TabsTab>
          <TabsTab value="history">Login History</TabsTab>
        </TabsList>
        <TabsPanel value="profile">
          <ProfileTab />
        </TabsPanel>
        <TabsPanel value="security">
          <SecurityTab />
        </TabsPanel>
        <TabsPanel value="password">
          <PasswordTab />
        </TabsPanel>
        <TabsPanel value="history">
          <LoginHistoryTab />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
