import prisma from '../lib/prisma';

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string | null
) {
  return prisma.notification.create({
    data: { userId, type, title, body, link: link ?? undefined },
  });
}
