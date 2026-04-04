-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "queuedAt" TIMESTAMP(3);

-- Backfill para filas ya en estado intermedio (timeout job requiere timestamp explícito)
UPDATE "service_requests"
SET "acceptedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'ACCEPTED' AND "acceptedAt" IS NULL;

UPDATE "service_requests"
SET "queuedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'QUEUED' AND "queuedAt" IS NULL;
