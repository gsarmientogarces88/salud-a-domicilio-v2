export declare function getScheduleForProfessional(professionalId: string): Promise<{
    availability: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        professionalId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotDuration: number;
        bufferMinutes: number;
    }[];
    blockedSlots: {
        id: string;
        createdAt: Date;
        reason: string | null;
        professionalId: string;
        startTime: string;
        endTime: string;
        date: Date;
    }[];
}>;
interface AvailabilityInput {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    bufferMinutes: number;
}
interface BlockedSlotInput {
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
}
export declare function setScheduleForProfessional(professionalId: string, availability: AvailabilityInput[], blockedSlots: BlockedSlotInput[]): Promise<{
    availability: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        professionalId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotDuration: number;
        bufferMinutes: number;
    }[];
    blockedSlots: {
        id: string;
        createdAt: Date;
        reason: string | null;
        professionalId: string;
        startTime: string;
        endTime: string;
        date: Date;
    }[];
}>;
export declare function getAvailableSlotsForDate(professionalId: string, date: Date): Promise<string[]>;
export declare function isSlotAvailable(professionalId: string, dateTime: Date): Promise<boolean>;
export {};
