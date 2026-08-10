-- Data fix: one "Verifikasi Dokumen" assignment for PT FORTUNA ATTAMANA JAYA was
-- seeded directly into the DB (not through the CR scheduling flow), so it kept
-- Prisma's schema default of ASSIGNED instead of the SUBMITTED every "dokumen"/
-- "technical" assignment gets forced to at creation (see schedules/route.ts) —
-- that's the one status value that unlocks the Verifikator review UI. Scoped
-- tight (company name + scheduleType + current status) so it can only ever
-- touch that one stray row, not any legitimately-ASSIGNED assignment.
UPDATE "assignment" a
SET status = 'SUBMITTED'
FROM "application" app
JOIN "company" c ON c.id = app."companyId"
WHERE a."applicationId" = app.id
  AND trim(c."companyName") ILIKE 'PT FORTUNA ATTAMANA JAYA'
  AND a."scheduleType" = 'dokumen'
  AND a.status = 'ASSIGNED';
