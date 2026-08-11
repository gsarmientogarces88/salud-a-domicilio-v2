import { LabExamRequestStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export function formatLabDisplayId(displayNumber: number) {
  return `EXA-${String(displayNumber).padStart(6, '0')}`;
}

export async function addLabEvent(requestId: string, kind: string, message: string) {
  return prisma.labExamEvent.create({
    data: { requestId, kind, message },
  });
}

export async function getPatientUserId(patientProfileId: string) {
  const p = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { userId: true },
  });
  return p?.userId ?? null;
}

export function isTerminalPatientStatus(s: LabExamRequestStatus) {
  return s === 'EXPIRED' || s === 'CANCELLED' || s === 'COMPLETED';
}
