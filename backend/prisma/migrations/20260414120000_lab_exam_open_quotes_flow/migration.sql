-- Nuevo flujo de cotizaciones abiertas para exámenes a domicilio.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LabQuoteStatus') THEN
    CREATE TYPE "LabQuoteStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
  END IF;
END $$;

ALTER TYPE "LabExamRequestStatus" RENAME TO "LabExamRequestStatus_old";
CREATE TYPE "LabExamRequestStatus" AS ENUM (
  'DRAFT',
  'PENDING_QUOTES',
  'QUOTED',
  'LAB_SELECTED',
  'SCHEDULED',
  'SAMPLE_COLLECTED',
  'RESULTS_READY',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED'
);

ALTER TABLE "lab_exam_requests"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "LabExamRequestStatus"
  USING (
    CASE
      WHEN "status"::text IN ('PENDING', 'IN_REVIEW') THEN 'PENDING_QUOTES'::"LabExamRequestStatus"
      WHEN "status"::text = 'PATIENT_ACCEPTED' THEN 'LAB_SELECTED'::"LabExamRequestStatus"
      WHEN "status"::text = 'REJECTED' THEN 'EXPIRED'::"LabExamRequestStatus"
      ELSE "status"::text::"LabExamRequestStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'PENDING_QUOTES';

DROP TYPE "LabExamRequestStatus_old";

ALTER TABLE "lab_exam_requests"
  DROP CONSTRAINT IF EXISTS "lab_exam_requests_laboratoryId_fkey";

ALTER TABLE "lab_exam_requests"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "preferredDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "preferredTimeRange" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "quoteDeadlineAt" TIMESTAMP(3) DEFAULT (NOW() + interval '90 minute'),
  ADD COLUMN IF NOT EXISTS "selectedQuoteId" TEXT;

ALTER TABLE "lab_quotes"
  ADD COLUMN IF NOT EXISTS "laboratoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "LabQuoteStatus" DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS "proposedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "proposedTimeRange" TEXT,
  ADD COLUMN IF NOT EXISTS "comment" TEXT;

UPDATE "lab_quotes" q
SET
  "laboratoryId" = r."laboratoryId",
  "proposedDate" = COALESCE(q."proposedDate", q."proposedVisitAt"),
  "proposedTimeRange" = COALESCE(
    q."proposedTimeRange",
    CASE
      WHEN q."proposedVisitAt" IS NOT NULL AND q."proposedVisitEndAt" IS NOT NULL
        THEN to_char(q."proposedVisitAt", 'HH24:MI') || ' - ' || to_char(q."proposedVisitEndAt", 'HH24:MI')
      ELSE NULL
    END
  ),
  "comment" = COALESCE(q."comment", q."labObservations"),
  "status" = COALESCE(q."status", 'SENT'::"LabQuoteStatus")
FROM "lab_exam_requests" r
WHERE q."requestId" = r."id" AND q."laboratoryId" IS NULL;

UPDATE "lab_quotes" q
SET "status" = CASE
  WHEN r."status" IN ('LAB_SELECTED', 'SCHEDULED', 'SAMPLE_COLLECTED', 'RESULTS_READY', 'COMPLETED') THEN 'ACCEPTED'::"LabQuoteStatus"
  WHEN r."status" IN ('EXPIRED', 'CANCELLED') THEN 'EXPIRED'::"LabQuoteStatus"
  ELSE q."status"
END
FROM "lab_exam_requests" r
WHERE q."requestId" = r."id";

UPDATE "lab_exam_requests" r
SET "selectedQuoteId" = q."id"
FROM "lab_quotes" q
WHERE r."id" = q."requestId"
  AND r."selectedQuoteId" IS NULL
  AND r."status" IN ('LAB_SELECTED', 'SCHEDULED', 'SAMPLE_COLLECTED', 'RESULTS_READY', 'COMPLETED');

UPDATE "lab_exam_requests"
SET
  "email" = COALESCE("email", 'pendiente@saludencasa.cl'),
  "region" = COALESCE("region", 'Sin región'),
  "city" = COALESCE("city", 'Sin provincia'),
  "quoteDeadlineAt" = COALESCE("quoteDeadlineAt", NOW() + interval '90 minute');

ALTER TABLE "lab_exam_requests"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "region" SET NOT NULL,
  ALTER COLUMN "city" SET NOT NULL,
  ALTER COLUMN "quoteDeadlineAt" SET NOT NULL;

ALTER TABLE "lab_quotes"
  DROP CONSTRAINT IF EXISTS "lab_quotes_requestId_key";

ALTER TABLE "lab_quotes"
  ALTER COLUMN "laboratoryId" SET NOT NULL,
  ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "lab_quotes"
  ADD CONSTRAINT "lab_quotes_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lab_exam_requests"
  DROP COLUMN IF EXISTS "laboratoryId",
  DROP COLUMN IF EXISTS "preferredTime";

ALTER TABLE "lab_quotes"
  DROP COLUMN IF EXISTS "proposedVisitAt",
  DROP COLUMN IF EXISTS "proposedVisitEndAt",
  DROP COLUMN IF EXISTS "labObservations";

CREATE UNIQUE INDEX IF NOT EXISTS "lab_quotes_requestId_laboratoryId_key" ON "lab_quotes"("requestId", "laboratoryId");
CREATE INDEX IF NOT EXISTS "lab_exam_requests_quoteDeadlineAt_idx" ON "lab_exam_requests"("quoteDeadlineAt");
CREATE INDEX IF NOT EXISTS "lab_exam_requests_commune_status_idx" ON "lab_exam_requests"("commune", "status");
CREATE INDEX IF NOT EXISTS "lab_exam_requests_city_status_idx" ON "lab_exam_requests"("city", "status");

ALTER TABLE "lab_exam_requests"
  ADD CONSTRAINT "lab_exam_requests_selectedQuoteId_fkey" FOREIGN KEY ("selectedQuoteId") REFERENCES "lab_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
