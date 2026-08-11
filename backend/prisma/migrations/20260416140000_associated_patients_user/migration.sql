-- Pacientes asociados al usuario (titular), migrados desde patient_associated_people.
CREATE TABLE "associated_patients" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "ageYears" INTEGER,
  "relationship" TEXT NOT NULL,
  "healthNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "associated_patients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "associated_patients_userId_idx" ON "associated_patients"("userId");

ALTER TABLE "associated_patients"
  ADD CONSTRAINT "associated_patients_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regclass('public.patient_associated_people') IS NOT NULL THEN
    INSERT INTO "associated_patients" ("id", "userId", "name", "birthDate", "ageYears", "relationship", "healthNotes", "createdAt", "updatedAt")
    SELECT
      pap."id",
      pf."userId",
      pap."fullName",
      pap."birthDate",
      NULL,
      pap."relationToHolder",
      pap."healthNotes",
      pap."createdAt",
      pap."updatedAt"
    FROM "patient_associated_people" pap
    INNER JOIN "patient_profiles" pf ON pf."id" = pap."patientProfileId";
    DROP TABLE "patient_associated_people";
  END IF;
END $$;

ALTER TABLE "patient_profiles" DROP COLUMN IF EXISTS "insuranceType";
ALTER TABLE "patient_profiles" DROP COLUMN IF EXISTS "insuranceProvider";

DROP TYPE IF EXISTS "PatientInsuranceType";
