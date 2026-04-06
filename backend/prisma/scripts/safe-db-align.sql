-- Alineación segura (idempotente): service_requests + enum AppointmentRequestStatus
-- No elimina valores de enum; solo renombra si aplica.

-- ---------------------------------------------------------------------------
-- 1) Columnas acceptedAt / queuedAt en service_requests (solo si faltan)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'acceptedAt'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "acceptedAt" TIMESTAMP(3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_requests'
      AND column_name = 'queuedAt'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "queuedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Backfill (mismo criterio que migración 20250403120000_*)
UPDATE "service_requests"
SET "acceptedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'ACCEPTED' AND "acceptedAt" IS NULL;

UPDATE "service_requests"
SET "queuedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'QUEUED' AND "queuedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Renombrar PENDING_PRO_CONFIRMATION -> PENDING solo si es seguro:
--    existe el valor viejo y aún no existe un literal PENDING en el enum.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AppointmentRequestStatus'
      AND e.enumlabel = 'PENDING_PRO_CONFIRMATION'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AppointmentRequestStatus'
      AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE "AppointmentRequestStatus" RENAME VALUE 'PENDING_PRO_CONFIRMATION' TO 'PENDING';
  END IF;
END $$;
