import { LabExamRequestStatus } from '@prisma/client';
export declare function formatLabDisplayId(displayNumber: number): string;
export declare function addLabEvent(requestId: string, kind: string, message: string): Promise<{
    id: string;
    createdAt: Date;
    kind: string;
    message: string;
    requestId: string;
}>;
export declare function getPatientUserId(patientProfileId: string): Promise<string | null>;
export declare function isTerminalPatientStatus(s: LabExamRequestStatus): s is "COMPLETED" | "CANCELLED" | "EXPIRED";
