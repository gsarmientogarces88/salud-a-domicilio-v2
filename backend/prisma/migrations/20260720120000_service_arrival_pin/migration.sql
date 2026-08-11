-- Confirmación de llegada del médico (PIN o click del paciente)
DO $$ BEGIN
  CREATE TYPE "ArrivalConfirmedBy" AS ENUM ('PIN', 'PATIENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "arrivalPin" TEXT;
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "arrivalConfirmedBy" "ArrivalConfirmedBy";
