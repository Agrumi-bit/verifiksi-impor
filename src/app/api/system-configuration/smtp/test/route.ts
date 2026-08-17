import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/require-admin-session";
import { sendMail } from "@/lib/mailer";

const testSchema = z.object({
  to: z.string().trim().email("Alamat email tujuan tidak valid"),
});

/** Sends a real test email through the currently-saved SMTP settings — surfaces the exact transport error to the admin on failure, never a generic "gagal". */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = testSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  try {
    await sendMail({
      to: parsed.data.to,
      subject: "Tes SMTP — Verifikasi Impor",
      html: "<p>Ini email percobaan dari pengaturan SMTP Verifikasi Impor. Kalau email ini sampai, konfigurasi SMTP sudah benar.</p>",
      text: "Ini email percobaan dari pengaturan SMTP Verifikasi Impor. Kalau email ini sampai, konfigurasi SMTP sudah benar.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim email percobaan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ data: { ok: true } });
}
