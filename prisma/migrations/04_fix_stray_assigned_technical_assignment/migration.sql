-- Same class of bug as migration 3, second instance found by the
-- audit-stray-assignments endpoint: a "technical" (Technical Analyst)
-- assignment for the same company, seeded directly into the DB, stuck at
-- Prisma's schema default of ASSIGNED instead of the SUBMITTED every
-- dokumen/technical assignment is forced to on creation. Scoped to the
-- exact assignment number found so it can only ever touch that one row.
UPDATE "assignment"
SET status = 'SUBMITTED'
WHERE "assignmentNumber" = 'ASG-TECHNICAL-20260810-4EFCF86B'
  AND "scheduleType" = 'technical'
  AND status = 'ASSIGNED';
