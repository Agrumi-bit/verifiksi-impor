import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { storage, STORAGE_NAMESPACES, type StorageNamespace } from "@/lib/storage";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function isStorageNamespace(value: string): value is StorageNamespace {
  return (STORAGE_NAMESPACES as readonly string[]).includes(value);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const namespace = formData.get("namespace");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (typeof namespace !== "string" || !isStorageNamespace(namespace)) {
    return NextResponse.json({ error: "Namespace tidak valid" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const path = await storage.save(namespace, key, buffer);

  return NextResponse.json({ path, name: file.name, size: file.size });
}
