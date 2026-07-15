-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "sheetSyncError" TEXT,
ADD COLUMN     "sheetSyncedAt" TIMESTAMP(3);
