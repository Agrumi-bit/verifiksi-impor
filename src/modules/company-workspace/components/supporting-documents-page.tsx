"use client";

import { useMemo } from "react";

import { useCompanyProfileQuery } from "./profile-tabs";
import { LibraryView, type LibraryItem, type LibraryVerificationStatus } from "./library-view";
import { DOCUMENT_FIELD_KEYS, documentFieldCode, documentFieldTitle, parseTaxProofYear } from "@/modules/company/document-fields";
import { buildDisplayFileName } from "@/lib/document-filename";

export function SupportingDocumentsPage() {
  const { data, isLoading, isError } = useCompanyProfileQuery();

  const items = useMemo<LibraryItem[]>(() => {
    if (!data) return [];
    const list: LibraryItem[] = [];

    for (const fieldKey of DOCUMENT_FIELD_KEYS) {
      const path = (data as unknown as Record<string, string | null | undefined>)[fieldKey];
      if (!path) continue;
      const meta = data.documentMeta[fieldKey];
      list.push({
        key: fieldKey,
        jenis: documentFieldTitle(fieldKey),
        name: buildDisplayFileName(documentFieldCode(fieldKey), data.companyName, meta?.version ?? 1, path),
        uploadedAt: meta?.uploadedAt ?? null,
        version: meta?.version ?? 1,
        verification: (meta?.verificationStatus as LibraryVerificationStatus | undefined) ?? "NOT_YET_VERIFIED",
        path,
      });
    }

    for (const tp of data.taxProofs) {
      if (!tp.docPath) continue;
      const fieldKey = `taxProof:${tp.year}`;
      const meta = data.documentMeta[fieldKey];
      list.push({
        key: fieldKey,
        jenis: `Bukti Bayar Pajak ${parseTaxProofYear(fieldKey) ?? tp.year}`,
        name: buildDisplayFileName(documentFieldCode(fieldKey), data.companyName, meta?.version ?? 1, tp.docPath),
        uploadedAt: meta?.uploadedAt ?? null,
        version: meta?.version ?? 1,
        verification: (meta?.verificationStatus as LibraryVerificationStatus | undefined) ?? "NOT_YET_VERIFIED",
        path: tp.docPath,
      });
    }

    return list;
  }, [data]);

  if (isLoading) {
    return <p className="p-10 text-center text-[13px] text-[#a68f80]">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="p-10 text-center text-[13px] text-[#c1361f]">Gagal memuat dokumen perusahaan.</p>;
  }

  return (
    <LibraryView
      title="Supporting Documents"
      description="Direktori dokumen legalitas dan pajak yang telah diunggah oleh perusahaan."
      items={items}
      emptyMessage="Belum ada dokumen yang diunggah. Lengkapi dokumen legal & pajak di Company Profile."
    />
  );
}
