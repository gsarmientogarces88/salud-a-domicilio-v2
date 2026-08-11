-- CreateEnum
CREATE TYPE "DoctorDocumentType" AS ENUM (
  'CEDULA_ANVERSO',
  'CEDULA_REVERSO',
  'SELFIE_CON_CEDULA',
  'TITULO_MEDICO',
  'CERTIFICADO_SIS',
  'CERTIFICADO_ESPECIALIDAD'
);

-- CreateEnum
CREATE TYPE "DoctorVerificationStatus" AS ENUM (
  'INCOMPLETE',
  'SUBMITTED',
  'APPROVED',
  'REJECTED'
);

-- AlterTable
ALTER TABLE "doctor_profiles"
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountType" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "verificationStatus" "DoctorVerificationStatus" NOT NULL DEFAULT 'INCOMPLETE',
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "documentsSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "doctor_verification_documents" (
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

-- CreateIndex
CREATE INDEX "doctor_verification_documents_doctorId_idx" ON "doctor_verification_documents"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_verification_documents_doctorId_type_key" ON "doctor_verification_documents"("doctorId", "type");

-- AddForeignKey
ALTER TABLE "doctor_verification_documents"
  ADD CONSTRAINT "doctor_verification_documents_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "doctor_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
