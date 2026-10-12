"use client";

import { ChapterWorkspace, type ChapterWorkspaceMeta } from "../engine/workspace";
import { vkiReport } from "../report";
import type { VkiDataset } from "../types";

const META: ChapterWorkspaceMeta = {
  title: "Laporan Pelaksanaan Verifikasi Kemampuan Industri (VKI)",
  scheme: "VKI",
  navLabel: "VKI",
  api: "/api/project-manager-workspace/pelaporan-pasal-47/vki",
  pdfScheme: "vki",
  emptyText: "Belum ada permohonan VKI berstatus Completed dengan LHVKI pada periode ini.",
  fileStem: "Pelaporan Pasal 47 VKI",
};

/** Laporan Kemenperin of VKI — Pelaporan Pasal 47 for the Project Manager. */
export function VkiModule() {
  return <ChapterWorkspace<VkiDataset> meta={META} build={vkiReport} />;
}
