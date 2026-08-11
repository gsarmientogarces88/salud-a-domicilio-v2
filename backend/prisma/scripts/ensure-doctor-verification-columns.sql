-- Ensure baseAddress and verification columns exist (idempotent)
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "baseAddress" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "bankAccountType" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "verificationNote" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "documentsSubmittedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "DoctorVerificationStatus" AS ENUM ('INCOMPLETE', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DoctorDocumentType" AS ENUM (
    'CEDULA_ANVERSO',
    'CEDULA_REVERSO',
    'SELFIE_CON_CEDULA',
    'TITULO_MEDICO',
    'CERTIFICADO_SIS',
    'CERTIFICADO_ESPECIALIDAD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "doctor_profiles"
    ADD COLUMN "verificationStatus" "DoctorVerificationStatus" NOT NULL DEFAULT 'INCOMPLETE';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "doctor_verification_documents" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "type" "DoctorDocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "doctor_verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "doctor_verification_documents_doctorId_idx"
  ON "doctor_verification_documents"("doctorId");

DO $$ BEGIN
  CREATE UNIQUE INDEX "doctor_verification_documents_doctorId_type_key"
    ON "doctor_verification_documents"("doctorId", "type");
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "doctor_verification_documents"
    ADD CONSTRAINT "doctor_verification_documents_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
