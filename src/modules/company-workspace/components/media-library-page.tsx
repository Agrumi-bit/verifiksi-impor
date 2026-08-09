"use client";

import { useMemo } from "react";
import { ImageIcon } from "lucide-react";

import { useCompanyProfileQuery } from "./profile-tabs";
import { LibraryView, type LibraryItem } from "./library-view";

export function MediaLibraryPage() {
  const { data, isLoading, isError } = useCompanyProfileQuery();

  const items = useMemo<LibraryItem[]>(() => {
    if (!data?.logoPath) return [];
    return [
      {
        key: "logo",
        jenis: "Logo Perusahaan",
        name: `Logo_${data.companyName.replace(/[^a-zA-Z0-9]+/g, "_")}`,
        uploadedAt: data.updatedAt,
        version: 1,
        verification: "NOT_APPLICABLE",
        path: data.logoPath,
        icon: ImageIcon,
      },
    ];
  }, [data]);

  if (isLoading) {
    return <p className="p-10 text-center text-[13px] text-[#a68f80]">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="p-10 text-center text-[13px] text-[#c1361f]">Gagal memuat media perusahaan.</p>;
  }

  return (
    <LibraryView
      title="Media Library"
      description="Pustaka logo dan gambar milik perusahaan Anda."
      items={items}
      emptyMessage="Belum ada logo atau media yang diunggah. Tambahkan logo perusahaan di Company Profile."
    />
  );
}
