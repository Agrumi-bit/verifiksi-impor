import { z } from "zod";

const requiredString = (message: string) => z.string().trim().min(1, message);

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const statusWithReasonSchema = statusSchema.extend({
  deactivationReason: z.string().trim().optional(),
});

export const unitOfMeasurementSchema = z.object({
  name: requiredString("Nama satuan wajib diisi"),
  symbol: requiredString("Simbol satuan wajib diisi"),
  description: z.string().trim().optional(),
});

export const electricityTariffMasterDataSchema = z.object({
  kelompok: requiredString("Kelompok wajib diisi"),
  golongan: requiredString("Golongan tarif wajib diisi"),
  batasDaya: requiredString("Batas daya wajib diisi"),
  tarifPerKwh: requiredString("Tarif per kWh wajib diisi"),
  keterangan: z.string().trim().optional(),
});

export const industryGroupSchema = z.object({
  name: requiredString("Nama kelompok industri wajib diisi"),
  code: requiredString("Kode kelompok industri wajib diisi"),
  description: z.string().trim().optional(),
});

export const commodityGroupSchema = z.object({
  name: requiredString("Nama kelompok komoditas wajib diisi"),
  code: requiredString("Kode kelompok wajib diisi"),
  industryGroupId: requiredString("Kelompok industri wajib dipilih"),
  description: z.string().trim().optional(),
});

export const commoditySubGroupSchema = z.object({
  name: requiredString("Nama sub kelompok komoditas wajib diisi"),
  code: requiredString("Kode sub kelompok wajib diisi"),
  commodityGroupId: requiredString("Kelompok komoditas wajib dipilih"),
  description: z.string().trim().optional(),
});

export const KBLI_VERSIONS = ["KBLI 2025", "KBLI 2020", "KBLI 2017"] as const;

export const kbliMasterDataSchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi kegiatan wajib diisi"),
  category: z.string().trim().default("-"),
  version: z.enum(KBLI_VERSIONS).default("KBLI 2020"),
});

export const hsCodeMasterDataSchema = z.object({
  hsCode: requiredString("Pos Tarif / HS Code wajib diisi"),
  description: requiredString("Uraian barang wajib diisi"),
  commodityGroupId: requiredString("Kelompok komoditas wajib dipilih"),
  commoditySubGroupId: requiredString("Sub kelompok komoditas wajib dipilih"),
  unitOfMeasurementId: requiredString("Satuan wajib dipilih"),
});

const checkboxBool = () => z.string().optional().transform((v) => v === "true");

export const lartasImporSchema = z.object({
  hsCodeId: requiredString("HS Code wajib dipilih"),
  apiP: checkboxBool(),
  apiUIndustri: checkboxBool(),
  apiUNonIndustri: checkboxBool(),
  barangKonsumsi: checkboxBool(),
  ppbb: checkboxBool(),
});
export const lartasImporUpdateSchema = lartasImporSchema.extend(statusSchema.shape);

export const unitOfMeasurementUpdateSchema =
  unitOfMeasurementSchema.extend(statusSchema.shape);
export const electricityTariffMasterDataUpdateSchema =
  electricityTariffMasterDataSchema.extend(statusSchema.shape);
export const industryGroupUpdateSchema =
  industryGroupSchema.extend(statusSchema.shape);
export const commodityGroupUpdateSchema =
  commodityGroupSchema.extend(statusSchema.shape);
export const commoditySubGroupUpdateSchema =
  commoditySubGroupSchema.extend(statusSchema.shape);
export const kbliMasterDataUpdateSchema =
  kbliMasterDataSchema.extend(statusWithReasonSchema.shape);
export const hsCodeMasterDataUpdateSchema =
  hsCodeMasterDataSchema.extend(statusSchema.shape);
