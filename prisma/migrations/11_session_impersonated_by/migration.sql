-- Adds the column better-auth's admin plugin writes to when an admin
-- impersonates another user's session.
ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;
