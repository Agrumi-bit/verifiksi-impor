import { z } from "zod";

import { TECHNICAL_MODULE_STATUSES, VKI_MODULE_KEYS, VIU_MODULE_KEYS, type TechnicalModuleStatusValue } from "./status";

export const technicalModuleDecisionSchema = z.object({
  status: z.enum(TECHNICAL_MODULE_STATUSES).default("PENDING"),
  keterangan: z.string().trim().optional(),
  kesimpulan: z.string().trim().optional(),
  inputs: z.record(z.string(), z.string()).optional(),
});
export type TechnicalModuleDecision = z.infer<typeof technicalModuleDecisionSchema>;

export const technicalAnalysisDataSchema = z.record(z.string(), technicalModuleDecisionSchema);
export type TechnicalAnalysisData = z.infer<typeof technicalAnalysisDataSchema>;

export const decisionSchema = z.object({
  decision: z.enum(["COMPLETED", "RETURNED"]),
  notes: z.string().trim().min(1, "Catatan keputusan wajib diisi"),
});

/**
 * Overall Belum Dianalisis/Sesuai/Tidak Sesuai verdict for one assignment — any module marked
 * Tidak Sesuai makes the whole thing Tidak Sesuai; every applicable module must be Sesuai for the
 * whole thing to read Sesuai; anything else (nothing started, or partially done) is Belum Dianalisis.
 */
export function overallTechnicalStatus(
  verificationType: "VKI" | "VIU" | string,
  data: TechnicalAnalysisData | null | undefined,
): TechnicalModuleStatusValue {
  const moduleKeys = verificationType === "VIU" ? VIU_MODULE_KEYS : VKI_MODULE_KEYS;
  const statuses = moduleKeys.map((key) => data?.[key]?.status ?? "PENDING");
  if (statuses.some((s) => s === "TIDAK_SESUAI")) return "TIDAK_SESUAI";
  if (statuses.every((s) => s === "SESUAI")) return "SESUAI";
  return "PENDING";
}

/** Gates the Decision Panel — every applicable module must have a verdict before Approve/Return is allowed. */
export function allModulesDecided(verificationType: "VKI" | "VIU" | string, data: TechnicalAnalysisData | null | undefined): boolean {
  const moduleKeys = verificationType === "VIU" ? VIU_MODULE_KEYS : VKI_MODULE_KEYS;
  return moduleKeys.every((key) => (data?.[key]?.status ?? "PENDING") !== "PENDING");
}
