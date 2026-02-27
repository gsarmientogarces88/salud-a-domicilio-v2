import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient({
  log: config.isDev ? ['error', 'warn'] : ['error'],
});

export default prisma;
