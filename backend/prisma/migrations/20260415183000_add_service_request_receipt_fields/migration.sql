ALTER TABLE "service_requests"
  ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptUploadedAt" TIMESTAMP(3);
