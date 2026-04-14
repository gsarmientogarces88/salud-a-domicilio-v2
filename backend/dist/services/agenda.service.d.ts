/**
 * Valida que la dirección esté dentro de cobertura y no en zona excluida.
 * @returns { valid: boolean, error?: string }
 */
export declare function validateAddressForProfessional(professional: {
    baseLat: number | null;
    baseLng: number | null;
    coverageKm: number | null;
    excludedZones: unknown;
}, lat: number, lng: number, commune: string): {
    valid: true;
} | {
    valid: false;
    error: string;
};
export declare function createAppointmentRequest(data: {
    patientId: string;
    professionalId: string;
    slotId: string;
    addressText: string;
    region: string;
    province: string;
    commune: string;
    lat: number;
    lng: number;
    notes?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    commune: string;
    province: string;
    region: string;
    patientId: string;
    status: import(".prisma/client").$Enums.AppointmentRequestStatus;
    notes: string | null;
    lat: number;
    lng: number;
    professionalId: string;
    slotId: string;
    addressText: string;
    rejectReason: string | null;
    rejectComment: string | null;
    confirmedAt: Date | null;
    rejectedAt: Date | null;
    expiredAt: Date | null;
}>;
export declare function acceptAppointmentRequest(requestId: string, professionalId: string): Promise<void>;
export declare function rejectAppointmentRequest(requestId: string, professionalId: string, reason: string, comment?: string): Promise<void>;
export declare function expireHeldRequests(): Promise<number>;
