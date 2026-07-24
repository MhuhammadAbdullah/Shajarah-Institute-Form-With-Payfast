-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'FIXED', 'BOGO');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "appliedCouponCode" TEXT,
ADD COLUMN     "bulkDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "freeRegistrationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "promotionDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresCode" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "publicTitle" TEXT,
    "subtitle" TEXT,
    "bannerText" TEXT,
    "discountType" "PromotionDiscountType" NOT NULL,
    "value" DECIMAL(10,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "buyQuantity" INTEGER,
    "freeQuantity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "firstActivatedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "allowBogoStacking" BOOLEAN NOT NULL DEFAULT false,
    "usageLimit" INTEGER,
    "usageLimitPerUser" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" DECIMAL(10,2),
    "minRegistrationCount" INTEGER,
    "showOnForm" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "bannerColor" TEXT,
    "bannerIcon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProgram" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionSession" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "freeCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionAuditLog" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startDate_endDate_idx" ON "Promotion"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Promotion_requiresCode_code_idx" ON "Promotion"("requiresCode", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionProgram_promotionId_programId_key" ON "PromotionProgram"("promotionId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionSession_promotionId_sessionId_key" ON "PromotionSession"("promotionId", "sessionId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_promotionId_userEmail_idx" ON "PromotionRedemption"("promotionId", "userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_promotionId_registrationId_key" ON "PromotionRedemption"("promotionId", "registrationId");

-- CreateIndex
CREATE INDEX "PromotionAuditLog_promotionId_createdAt_idx" ON "PromotionAuditLog"("promotionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PromotionProgram" ADD CONSTRAINT "PromotionProgram_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProgram" ADD CONSTRAINT "PromotionProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionSession" ADD CONSTRAINT "PromotionSession_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionSession" ADD CONSTRAINT "PromotionSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionAuditLog" ADD CONSTRAINT "PromotionAuditLog_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
