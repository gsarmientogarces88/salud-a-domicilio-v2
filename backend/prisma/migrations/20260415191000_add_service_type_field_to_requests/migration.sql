DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceRequestServiceType') THEN
    CREATE TYPE "ServiceRequestServiceType" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'WEIGHT_PROGRAM');
  END IF;
END $$;

ALTER TABLE "service_requests"
  ADD COLUMN IF NOT EXISTS "serviceType" "ServiceRequestServiceType";

UPDATE "service_requests"
SET "serviceType" = CASE
  WHEN lower(coalesce("description", '')) LIKE '%baja de peso%' THEN 'WEIGHT_PROGRAM'::"ServiceRequestServiceType"
  WHEN "type" = 'SCHEDULED' THEN 'SCHEDULED'::"ServiceRequestServiceType"
  ELSE 'IMMEDIATE'::"ServiceRequestServiceType"
END
WHERE "serviceType" IS NULL;

ALTER TABLE "service_requests"
  ALTER COLUMN "serviceType" SET NOT NULL,
  ALTER COLUMN "serviceType" SET DEFAULT 'IMMEDIATE';
