"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SmtpData = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  hasPassword: boolean;
  updatedByName: string | null;
  updatedAt: string;
};

function useSmtpSettings() {
  return useQuery({
    queryKey: ["system-configuration", "smtp"],
    queryFn: async () => {
      const response = await fetch("/api/system-configuration/smtp");
      if (!response.ok) throw new Error("Gagal memuat pengaturan SMTP");
      const json = (await response.json()) as { data: SmtpData };
      return json.data;
    },
  });
}

const inputClass = "w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none";

export function SmtpForm() {
  const { data, isLoading, isError } = useSmtpSettings();

  if (isLoading) return <p className="text-[13px] text-[#8a7565]">Memuat pengaturan SMTP...</p>;
  if (isError || !data) return <p className="text-[13px] text-[#c1361f]">Gagal memuat pengaturan SMTP.</p>;

  return <SmtpFormBody smtp={data} />;
}

type Draft = {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

function toDraft(smtp: SmtpData): Draft {
  return {
    host: smtp.host,
    port: String(smtp.port),
    secure: smtp.secure,
    username: smtp.username,
    password: "",
    fromName: smtp.fromName,
    fromEmail: smtp.fromEmail,
    replyTo: smtp.replyTo,
  };
}

function SmtpFormBody({ smtp }: { smtp: SmtpData }) {
  const queryClient = useQueryClient();
  const queryKey = ["system-configuration", "smtp"];
  const [draft, setDraft] = useState<Draft>(() => toDraft(smtp));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  function set(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/system-configuration/smtp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: draft.host,
        port: Number(draft.port),
        secure: draft.secure,
        username: draft.username,
        ...(draft.password ? { password: draft.password } : {}),
        fromName: draft.fromName,
        fromEmail: draft.fromEmail,
        replyTo: draft.replyTo,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan pengaturan SMTP");
      return;
    }
    toast.success("Pengaturan SMTP disimpan.");
    setDraft((prev) => ({ ...prev, password: "" }));
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleTest() {
    if (!testEmail.trim()) {
      toast.error("Isi alamat email tujuan tes dulu");
      return;
    }
    setTesting(true);
    const response = await fetch("/api/system-configuration/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail }),
    });
    setTesting(false);
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error ?? "Gagal mengirim email percobaan");
      return;
    }
    toast.success(`Email percobaan terkirim ke ${testEmail}.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <p className="text-[12.5px] text-[#8a7565]">
          Kredensial SMTP dipakai aplikasi untuk mengirim email keluar. Contoh Hostinger: host <code>smtp.hostinger.com</code>, port{" "}
          <code>465</code> (SSL) atau <code>587</code> (STARTTLS), username adalah alamat email penuh (mis.{" "}
          <code>noreply@domainanda.com</code>).
        </p>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Server SMTP</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">Alamat server dan port pengiriman email.</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Host</div>
            <input type="text" value={draft.host} onChange={(e) => set({ host: e.target.value })} className={inputClass} placeholder="smtp.hostinger.com" />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Port</div>
            <input type="text" inputMode="numeric" value={draft.port} onChange={(e) => set({ port: e.target.value })} className={inputClass} placeholder="465" />
          </div>
        </div>
        <label className="mt-3.5 flex w-fit items-center gap-2 text-[12.5px] text-[#20180f]">
          <input type="checkbox" checked={draft.secure} onChange={(e) => set({ secure: e.target.checked })} />
          Gunakan SSL/TLS (nyalakan untuk port 465, matikan untuk STARTTLS di port 587)
        </label>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Kredensial</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">
          Username &amp; password akun email Hostinger. Password tidak pernah ditampilkan ulang setelah disimpan — kosongkan kalau
          tidak ingin menggantinya.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Username</div>
            <input type="text" value={draft.username} onChange={(e) => set({ username: e.target.value })} className={inputClass} placeholder="noreply@domainanda.com" />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">
              Password {smtp.hasPassword && <span className="font-normal text-[#1a9850]">(sudah diatur)</span>}
            </div>
            <input
              type="password"
              value={draft.password}
              onChange={(e) => set({ password: e.target.value })}
              className={inputClass}
              placeholder={smtp.hasPassword ? "Kosongkan untuk tetap pakai yang lama" : "Masukkan password"}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Pengirim</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">Nama dan alamat yang dilihat penerima email.</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Nama Pengirim</div>
            <input type="text" value={draft.fromName} onChange={(e) => set({ fromName: e.target.value })} className={inputClass} placeholder="Verifikasi Impor" />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Email Pengirim</div>
            <input type="text" value={draft.fromEmail} onChange={(e) => set({ fromEmail: e.target.value })} className={inputClass} placeholder="noreply@domainanda.com" />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Reply-To (opsional)</div>
            <input type="text" value={draft.replyTo} onChange={(e) => set({ replyTo: e.target.value })} className={inputClass} placeholder="support@domainanda.com" />
          </div>
        </div>
      </div>

      {smtp.updatedByName && (
        <p className="text-[11px] text-[#a68f80]">
          Terakhir diubah oleh {smtp.updatedByName}, {new Date(smtp.updatedAt).toLocaleString("id-ID")}
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
          {saving ? "Menyimpan..." : "Simpan Pengaturan SMTP"}
        </button>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Tes Kirim Email</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">
          Kirim email percobaan pakai pengaturan yang sudah tersimpan (simpan dulu perubahan di atas sebelum tes).
        </p>
        <div className="flex flex-wrap gap-2.5">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="min-w-60 flex-1 rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
            placeholder="tujuan@email.com"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-50"
          >
            {testing ? "Mengirim..." : "Kirim Tes"}
          </button>
        </div>
      </div>
    </div>
  );
}
