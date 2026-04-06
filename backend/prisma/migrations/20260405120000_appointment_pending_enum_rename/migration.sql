-- Rename marketplace appointment pending state to PENDING (API / product language).
ALTER TYPE "AppointmentRequestStatus" RENAME VALUE 'PENDING_PRO_CONFIRMATION' TO 'PENDING';
