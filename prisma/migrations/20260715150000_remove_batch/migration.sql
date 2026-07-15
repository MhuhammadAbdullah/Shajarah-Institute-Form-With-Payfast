-- Remove Batch entirely: Registration.batch, FeeStructure.batchId, the
-- Batch table itself, and the BATCHES value from the OptionSource enum.
-- Pre-checked: 0 FeeStructure collisions once (programId, campusId,
-- sessionId) becomes the unique key; the seeded "batch" FormField was
-- already deleted before this migration runs.

-- Drop the FK and old unique index involving batchId
ALTER TABLE "FeeStructure" DROP CONSTRAINT "FeeStructure_batchId_fkey";
DROP INDEX "FeeStructure_programId_batchId_campusId_sessionId_key";

-- Drop the batch columns
ALTER TABLE "FeeStructure" DROP COLUMN "batchId";
ALTER TABLE "Registration" DROP COLUMN "batch";

-- Drop the Batch table
DROP TABLE "Batch";

-- New unique constraint without batchId
CREATE UNIQUE INDEX "FeeStructure_programId_campusId_sessionId_key" ON "FeeStructure"("programId", "campusId", "sessionId");

-- Remove BATCHES from OptionSource (Postgres has no DROP VALUE - recreate the type)
ALTER TYPE "OptionSource" RENAME TO "OptionSource_old";
CREATE TYPE "OptionSource" AS ENUM ('STATIC', 'PROGRAMS', 'CAMPUSES', 'SESSIONS');
ALTER TABLE "FormField" ALTER COLUMN "optionSource" TYPE "OptionSource" USING ("optionSource"::text::"OptionSource");
DROP TYPE "OptionSource_old";
