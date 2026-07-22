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
