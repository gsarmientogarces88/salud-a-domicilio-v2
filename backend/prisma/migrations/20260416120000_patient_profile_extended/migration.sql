DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatientInsuranceType') THEN
    CREATE TYPE "PatientInsuranceType" AS ENUM ('ISAPRE', 'PARTICULAR');
  END IF;
END $$;

ALTER TABLE "patient_profiles"
  ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "addressReference" TEXT,
  ADD COLUMN IF NOT EXISTS "chronicConditions" TEXT,
  ADD COLUMN IF NOT EXISTS "currentMedications" TEXT,
  ADD COLUMN IF NOT EXISTS "allergies" TEXT,
  ADD COLUMN IF NOT EXISTS "previousSurgeries" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceType" "PatientInsuranceType",
  ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT;

UPDATE "patient_profiles"
SET "insuranceType" = 'PARTICULAR'::"PatientInsuranceType"
WHERE "insuranceType" IS NULL;

ALTER TABLE "patient_profiles"
  ALTER COLUMN "insuranceType" SET NOT NULL,
  ALTER COLUMN "insuranceType" SET DEFAULT 'PARTICULAR'::"PatientInsuranceType";

CREATE TABLE IF NOT EXISTS "patient_associated_people" (
  "id" TEXT NOT NULL,
  "patientProfileId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "relationToHolder" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "healthNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_associated_people_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "patient_associated_people_patientProfileId_idx"
  ON "patient_associated_people"("patientProfileId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_associated_people_patientProfileId_fkey'
  ) THEN
    ALTER TABLE "patient_associated_people"
      ADD CONSTRAINT "patient_associated_people_patientProfileId_fkey"
      FOREIGN KEY ("patientProfileId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
