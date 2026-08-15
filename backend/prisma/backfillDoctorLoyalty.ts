import prisma from '../src/lib/prisma';
import { backfillDoctorLoyalty, ensureLoyaltyCatalog } from '../src/services/loyalty.service';

/**
 * Acredita Medicilio Puntos por atenciones COMPLETED históricas.
 * Idempotente: se puede ejecutar varias veces sin duplicar puntos.
 *
 *   cd backend && npx ts-node prisma/backfillDoctorLoyalty.ts
 */
async function main() {
  await ensureLoyaltyCatalog();
  const result = await backfillDoctorLoyalty({ notify: false });
  console.log('[loyalty.backfill]', result);
}

main()
  .catch((e) => {
    console.error('[loyalty.backfill] Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
