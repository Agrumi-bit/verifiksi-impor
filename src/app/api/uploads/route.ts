import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { storage, STORAGE_NAMESPACES, type StorageNamespace } from "@/lib/storage";
import { schedulePdfPreview } from "@/lib/pdf-preview";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// HEIC/HEIF (iPhone default) can't be decoded by the browsers that view reports, and no HEIC
// decoder ships with the server — refuse it with a clear way out instead of storing a file that
// later shows as a broken image.
const HEIC_EXTENSIONS = /\.(heic|heif)$/i;
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const HEIC_MESSAGE =
  "Format HEIC/HEIF belum didukung. Simpan foto sebagai JPG/PNG lalu unggah ulang (iPhone: Pengaturan › Kamera › Format › Paling Kompatibel).";

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
  if (HEIC_EXTENSIONS.test(file.name) || HEIC_MIME_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json({ error: HEIC_MESSAGE }, { status: 415 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const path = await storage.save(namespace, key, buffer);
  // Large scanned PDFs get a compressed viewing copy in the background (original untouched).
  schedulePdfPreview(path);

  return NextResponse.json({ path, name: file.name, size: file.size });
}
