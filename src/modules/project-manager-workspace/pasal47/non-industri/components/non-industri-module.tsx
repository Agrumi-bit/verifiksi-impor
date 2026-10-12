"use client";

import { ChapterWorkspace, type ChapterWorkspaceMeta } from "../engine/workspace";
import { nonIndustriReport, SUBJECT } from "../report";
import type { NonIndustriDataset } from "../types";

const META: ChapterWorkspaceMeta = {
  title: `Laporan Pelaksanaan VIU – ${SUBJECT}`,
  scheme: "VIU Non Industri",
  navLabel: "Non Industri",
  api: "/api/project-manager-workspace/pelaporan-pasal-47/non-industri",
  pdfScheme: "non-industri",
  emptyText: "Belum ada permohonan VIU Bahan Baku Non Industri pada periode ini.",
  fileStem: "Pelaporan Pasal 47 Non Industri",
};

/** Laporan Kemenperin of VIU Bahan Baku Non Industri — Pelaporan Pasal 47 for the Project Manager. */
export function NonIndustriModule() {
  return <ChapterWorkspace<NonIndustriDataset> meta={META} build={nonIndustriReport} />;
}
