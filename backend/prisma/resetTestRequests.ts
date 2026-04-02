import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const confirm = process.env.RESET_TEST_REQUESTS;
  if (confirm !== '1') {
    console.log(
      '🛑 Aborting. Set RESET_TEST_REQUESTS=1 to confirm deletion of test operational data (service requests).'
    );
    process.exit(1);
  }

  const before = {
    serviceRequests: await prisma.serviceRequest.count(),
    rejections: await prisma.serviceRequestRejection.count(),
    transactions: await prisma.transaction.count(),
    chatMessages: await prisma.serviceChatMessage.count(),
  };

  // Borrar datos operativos de solicitudes (sin tocar users/profiles/config)
  const result = await prisma.$transaction(async (tx) => {
    const chatMessages = await tx.serviceChatMessage.deleteMany({});
    const rejections = await tx.serviceRequestRejection.deleteMany({});
    const transactions = await tx.transaction.deleteMany({});
    const serviceRequests = await tx.serviceRequest.deleteMany({});
    return { chatMessages, rejections, transactions, serviceRequests };
  });

  const after = {
    serviceRequests: await prisma.serviceRequest.count(),
    rejections: await prisma.serviceRequestRejection.count(),
    transactions: await prisma.transaction.count(),
    chatMessages: await prisma.serviceChatMessage.count(),
  };

  console.log('✅ resetTestRequests completed');
  console.table({ before, deleted: {
    serviceRequests: result.serviceRequests.count,
    rejections: result.rejections.count,
    transactions: result.transactions.count,
    chatMessages: result.chatMessages.count,
  }, after });
}

main()
  .catch((e) => {
    console.error('❌ resetTestRequests failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

