import { z } from "zod";

/** Body of both "Kembalikan untuk Revisi" endpoints (Customer Relationship and Admin). The
 * length/section rules themselves are enforced by `returnApplicationForRevision`. */
export const returnRequestSchema = z.object({
  reason: z.string().trim().min(1, "Alasan pengembalian wajib diisi"),
  sections: z.array(z.string().trim().min(1)).max(30).optional(),
});
