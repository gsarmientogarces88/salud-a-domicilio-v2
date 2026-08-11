-- Campos de contacto/paciente en solicitudes de agenda (mismo modelo que urgencia)
ALTER TABLE "appointment_requests" ADD COLUMN IF NOT EXISTS "patientName" TEXT;
ALTER TABLE "appointment_requests" ADD COLUMN IF NOT EXISTS "patientAge" INTEGER;
ALTER TABLE "appointment_requests" ADD COLUMN IF NOT EXISTS "telefono" TEXT;
ALTER TABLE "appointment_requests" ADD COLUMN IF NOT EXISTS "apartment" TEXT;
