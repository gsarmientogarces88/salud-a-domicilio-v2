-- Elimina duplicados (misma jornada en dos filas) conservando el registro con id menor
DELETE FROM "availability_slots" AS a
  USING "availability_slots" AS b
 WHERE a."id" > b."id"
   AND a."professionalId" = b."professionalId"
   AND a."startAt" = b."startAt";

-- Clave única (professionalId, startAt) para upsert idempotente vía findUnique
CREATE UNIQUE INDEX "availability_slots_professionalId_startAt_key"
  ON "availability_slots" ("professionalId", "startAt");
