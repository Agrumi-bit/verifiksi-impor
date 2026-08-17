import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getSmtpSettings, SMTP_ID } from "@/lib/mailer";
import { requireAdminSession } from "@/lib/require-admin-session";

/** Admin-only — this holds a real SMTP password, so unlike Branding/Surat Tugas this is never public. The password itself is never echoed back, only whether one is currently set. */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const settings = await getSmtpSettings();
  const { password, ...rest } = settings;
  return NextResponse.json({ data: { ...rest, hasPassword: Boolean(password.trim()) } });
}

const patchSchema = z.object({
  host: z.string().trim().min(1, "Host wajib diisi"),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1, "Username wajib diisi"),
  // Empty/omitted password means "keep the existing one" — the form never receives the real
  // saved password to prefill, so an empty submit here is a deliberate no-op, not an erase.
  password: z.string().optional(),
  fromName: z.string().trim().optional(),
  fromEmail: z.string().trim().email("Email pengirim tidak valid").or(z.literal("")),
  replyTo: z.string().trim().email("Reply-To tidak valid").or(z.literal("")).optional(),
});

export async function PATCH(request: Request) {
  const { error, session } = await requireAdminSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const settings = await db.smtpSettings.upsert({
    where: { id: SMTP_ID },
    update: {
      ...rest,
      fromName: rest.fromName ?? "",
      replyTo: rest.replyTo ?? "",
      ...(password ? { password } : {}),
      updatedByName: session.user.name,
    },
    create: {
      id: SMTP_ID,
      ...rest,
      fromName: rest.fromName ?? "",
      replyTo: rest.replyTo ?? "",
      password: password ?? "",
      updatedByName: session.user.name,
    },
  });

  return NextResponse.json({
    data: {
      id: settings.id,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      replyTo: settings.replyTo,
      updatedByName: settings.updatedByName,
      updatedAt: settings.updatedAt,
      hasPassword: Boolean(settings.password.trim()),
    },
  });
}
