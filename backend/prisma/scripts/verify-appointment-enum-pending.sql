-- Verifica que el literal PENDING existe en el enum (falla si no está alineado con schema.prisma).
SELECT 'PENDING'::"AppointmentRequestStatus" AS pending_cast_ok;
