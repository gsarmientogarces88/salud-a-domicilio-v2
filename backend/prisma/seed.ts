import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1) Admin
  const adminEmail = 'admin@salud.cl';
  const exists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!exists) {
    const hashed = await bcrypt.hash('Admin123!', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        firstName: 'Admin',
        lastName: 'Plataforma',
        role: 'ADMIN',
      },
    });
    console.log('✅ Usuario ADMIN creado (admin@salud.cl / Admin123!)');
  } else {
    console.log('⏭️  Usuario ADMIN ya existe');
  }

  // 2) Commission settings
  const cfg = await prisma.commissionSetting.findFirst();

  if (!cfg) {
    await prisma.commissionSetting.create({
      data: {
        percentage: 20,
        urgentFixedFee: 50000,
        pendingTimeoutSec: 240,
        maxCancellations: 3,
      },
    });
    console.log('✅ Commission settings creadas (20%, $50.000 urgencia, 240s timeout, 3 max cancel)');
  } else {
    console.log('⏭️  Commission settings ya existen');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
