import { z } from "zod";

import { CR_DOCUMENT_CHECK_STATUSES, CR_OUTCOMES, SCHEDULE_TYPES } from "./status";

export const updateOutcomeSchema = z.object({
  crOutcome: z.enum(CR_OUTCOMES),
});

export const updateFollowUpSchema = z.object({
  crFollowUpDate: z.string().trim().optional(),
});

// Design's edit form treats verificationType/category/product/location as
// flat free-text — but those are real enums/structured arrays elsewhere in
// this app (VKI/VIU, products[], locations[]). Only internal notes are
// genuinely freeform, so that's the only field Customer Relation can edit
// here; the rest of "Data Aplikasi" is shown read-only from real fields.
export const editApplicationFieldsSchema = z.object({
  notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
});

/**
 * "check" writes a real verification decision to the same `ApplicationDocumentVersion` /
 * `CompanyDocumentVersion` tables verifikator-workspace uses (status.ts's `CR_DOCUMENT_CHECK_STATUSES`
 * — no ad-hoc valid/invalid flag anymore, so this is the same source of truth the company sees on
 * their own upload screen, and the same one that drives the real "rejected → re-upload → version 2" flow).
 * "request" is Customer-Relation-only — asking the company for a document that hasn't been
 * uploaded yet — and has no equivalent in the verifikator status system.
 */
export const verifyDocumentSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("check"),
    status: z.enum(CR_DOCUMENT_CHECK_STATUSES),
    note: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
  }),
  z.object({
    action: z.literal("request"),
    note: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
  }),
]);

/** Stores only the "Minta Dokumen" memo — verification status itself lives on the real document version tables. */
export const crDocumentRequestSchema = z.object({
  requestNote: z.string().trim().optional(),
});
export type CrDocumentRequest = z.infer<typeof crDocumentRequestSchema>;

export const crDocumentRequestsSchema = z.record(z.string(), crDocumentRequestSchema);
export type CrDocumentRequests = z.infer<typeof crDocumentRequestsSchema>;

export const createScheduleSchema = z.object({
  scheduleType: z.enum(SCHEDULE_TYPES),
  facility: z.string().trim().max(200, "Fasilitas maksimal 200 karakter").optional(),
  date: z.string().trim().min(1, "Tanggal wajib diisi"),
  personId: z.string().trim().min(1, "Orang wajib dipilih"),
});

// `direction` is deliberately NOT accepted from the client — SYSTEM messages
// (audit trail entries) are only ever created server-side from trusted call
// sites (document actions, schedule creation, letter submission). A message
// sent through this public schema is always a genuine outbound chat message.
export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Pesan tidak boleh kosong").max(2000, "Pesan maksimal 2000 karakter"),
});
