import { z } from "zod";

import { ROLES } from "./roles";

const requiredString = (message: string) => z.string().trim().min(1, message);

export const createUserSchema = z.object({
  name: requiredString("Nama wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(ROLES, { message: "Pilih role" }),
});
export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES, { message: "Pilih role" }),
});
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;

export const updateUserProfileSchema = z.object({
  name: requiredString("Nama wajib diisi").optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh huruf, angka, titik, underscore")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Email tidak valid").optional(),
  phone: z.string().trim().optional().or(z.literal("")),
  companyId: z.string().trim().optional().or(z.literal("")),
  role: z.enum(ROLES, { message: "Pilih role" }).optional(),
});
export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const updateUserStatusSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().trim().optional(),
});
export type UpdateUserStatusValues = z.infer<typeof updateUserStatusSchema>;
