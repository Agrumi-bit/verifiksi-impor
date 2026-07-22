import { z } from "zod";

const requiredString = (message: string) => z.string().trim().min(1, message);

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const unitOfMeasurementSchema = z.object({
  name: requiredString("Nama satuan wajib diisi"),
  symbol: requiredString("Simbol satuan wajib diisi"),
  description: z.string().trim().optional(),
});

export const commodityGroupSchema = z.object({
  name: requiredString("Nama kelompok komoditas wajib diisi"),
  code: requiredString("Kode kelompok wajib diisi"),
  description: z.string().trim().optional(),
});

export const commoditySubGroupSchema = z.object({
  name: requiredString("Nama sub kelompok komoditas wajib diisi"),
  code: requiredString("Kode sub kelompok wajib diisi"),
  commodityGroupId: requiredString("Kelompok komoditas wajib dipilih"),
  description: z.string().trim().optional(),
});

export const kbliMasterDataSchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi kegiatan wajib diisi"),
});

export const hsCodeMasterDataSchema = z.object({
  hsCode: requiredString("Pos Tarif / HS Code wajib diisi"),
  description: requiredString("Uraian barang wajib diisi"),
  commodityGroupId: requiredString("Kelompok komoditas wajib dipilih"),
  commoditySubGroupId: requiredString("Sub kelompok komoditas wajib dipilih"),
  unitOfMeasurementId: requiredString("Satuan wajib dipilih"),
});

export const unitOfMeasurementUpdateSchema =
  unitOfMeasurementSchema.extend(statusSchema.shape);
export const commodityGroupUpdateSchema =
  commodityGroupSchema.extend(statusSchema.shape);
export const commoditySubGroupUpdateSchema =
  commoditySubGroupSchema.extend(statusSchema.shape);
export const kbliMasterDataUpdateSchema =
  kbliMasterDataSchema.extend(statusSchema.shape);
export const hsCodeMasterDataUpdateSchema =
  hsCodeMasterDataSchema.extend(statusSchema.shape);
