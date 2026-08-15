-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('VISIT_COMPLETED', 'BONUS', 'CAMPAIGN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LoyaltySourceType" AS ENUM ('SERVICE_REQUEST', 'CAMPAIGN', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LoyaltyBenefitType" AS ENUM ('NONE', 'COURSE', 'TRIP', 'PRIZE', 'OTHER');

-- CreateEnum
CREATE TYPE "LoyaltyBenefitStatus" AS ENUM ('NOT_CONFIGURED', 'AVAILABLE', 'CLAIMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pointsPerCompletedVisit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_milestones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pointsRequired" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "congratulationTitle" TEXT NOT NULL,
    "congratulationBody" TEXT NOT NULL,
    "benefitName" TEXT,
    "benefitDescription" TEXT,
    "benefitImageUrl" TEXT,
    "benefitValue" INTEGER,
    "benefitType" "LoyaltyBenefitType" NOT NULL DEFAULT 'NONE',
    "benefitStatus" "LoyaltyBenefitStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "benefitConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_loyalty" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "completedVisitsCount" INTEGER NOT NULL DEFAULT 0,
    "currentLevelCode" TEXT NOT NULL DEFAULT 'LEVEL_INITIAL',
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_loyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "doctorLoyaltyId" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "sourceType" "LoyaltySourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_loyalty_milestones" (
    "id" TEXT NOT NULL,
    "doctorLoyaltyId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "notificationId" TEXT,
    "benefitClaimed" BOOLEAN NOT NULL DEFAULT false,
    "benefitClaimedAt" TIMESTAMP(3),
    "benefitUnlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_loyalty_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_levels_code_key" ON "loyalty_levels"("code");

-- CreateIndex
CREATE INDEX "loyalty_levels_minPoints_idx" ON "loyalty_levels"("minPoints");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_milestones_code_key" ON "loyalty_milestones"("code");

-- CreateIndex
CREATE INDEX "loyalty_milestones_pointsRequired_idx" ON "loyalty_milestones"("pointsRequired");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_loyalty_doctorId_key" ON "doctor_loyalty"("doctorId");

-- CreateIndex
CREATE INDEX "doctor_loyalty_pointsBalance_idx" ON "doctor_loyalty"("pointsBalance");

-- CreateIndex
CREATE INDEX "doctor_loyalty_currentLevelCode_idx" ON "doctor_loyalty"("currentLevelCode");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_sourceType_sourceId_type_key" ON "loyalty_transactions"("sourceType", "sourceId", "type");

-- CreateIndex
CREATE INDEX "loyalty_transactions_doctorLoyaltyId_occurredAt_idx" ON "loyalty_transactions"("doctorLoyaltyId", "occurredAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_sourceId_idx" ON "loyalty_transactions"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_loyalty_milestones_doctorLoyaltyId_milestoneId_key" ON "doctor_loyalty_milestones"("doctorLoyaltyId", "milestoneId");

-- CreateIndex
CREATE INDEX "doctor_loyalty_milestones_milestoneId_idx" ON "doctor_loyalty_milestones"("milestoneId");

-- AddForeignKey
ALTER TABLE "doctor_loyalty" ADD CONSTRAINT "doctor_loyalty_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_doctorLoyaltyId_fkey" FOREIGN KEY ("doctorLoyaltyId") REFERENCES "doctor_loyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_loyalty_milestones" ADD CONSTRAINT "doctor_loyalty_milestones_doctorLoyaltyId_fkey" FOREIGN KEY ("doctorLoyaltyId") REFERENCES "doctor_loyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_loyalty_milestones" ADD CONSTRAINT "doctor_loyalty_milestones_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "loyalty_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catálogo inicial (nombres de nivel provisionales; el code es estable)
INSERT INTO "loyalty_settings" ("id", "pointsPerCompletedVisit", "createdAt", "updatedAt")
VALUES ('default', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "loyalty_levels" ("id", "code", "name", "minPoints", "maxPoints", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('level_initial', 'LEVEL_INITIAL', 'Nivel Inicial', 0, 99, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_100', 'LEVEL_100', 'Nivel 100', 100, 199, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_200', 'LEVEL_200', 'Nivel 200', 200, 499, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_500', 'LEVEL_500', 'Nivel 500', 500, 999, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_1000', 'LEVEL_1000', 'Nivel 1.000', 1000, 1999, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('level_2000', 'LEVEL_2000', 'Nivel 2.000', 2000, NULL, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "loyalty_milestones" ("id", "code", "pointsRequired", "sortOrder", "isActive", "title", "congratulationTitle", "congratulationBody", "benefitType", "benefitStatus", "createdAt", "updatedAt")
VALUES
  ('milestone_100', 'MILESTONE_100', 100, 1, true, '100 atenciones', '¡Felicitaciones! Has alcanzado 100 atenciones realizadas en Medicilio.', 'Has completado 100 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.', 'NONE', 'NOT_CONFIGURED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('milestone_200', 'MILESTONE_200', 200, 2, true, '200 atenciones', '¡Felicitaciones! Has alcanzado 200 atenciones realizadas en Medicilio.', 'Has completado 200 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.', 'NONE', 'NOT_CONFIGURED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('milestone_500', 'MILESTONE_500', 500, 3, true, '500 atenciones', '¡Felicitaciones! Has alcanzado 500 atenciones realizadas en Medicilio.', 'Has completado 500 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.', 'NONE', 'NOT_CONFIGURED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('milestone_1000', 'MILESTONE_1000', 1000, 4, true, '1.000 atenciones', '¡Felicitaciones! Has alcanzado 1.000 atenciones realizadas en Medicilio.', 'Has completado 1.000 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.', 'NONE', 'NOT_CONFIGURED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('milestone_2000', 'MILESTONE_2000', 2000, 5, true, '2.000 atenciones', '¡Felicitaciones! Has alcanzado 2.000 atenciones realizadas en Medicilio.', 'Has completado 2.000 atenciones a través de Medicilio. Gracias por formar parte de nuestra red médica.', 'NONE', 'NOT_CONFIGURED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
