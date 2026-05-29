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
/**
 * Si el prestador no tiene reglas en `availabilities` (nunca abrió ajustes o seed incompleto),
 * crea lunes a viernes 09:00–18:00, 30 min, buffer 15 (misma base que /doctor settings).
 * Sin esto, GET /agenda/slots no puede generar filas a partir de `availability_slots` vacía.
 */
export declare function ensureDefaultMonFriAvailabilityIfEmpty(professionalId: string): Promise<{
    filled: boolean;
    rowsBefore: number;
    rowsAfter: number;
}>;
export type AgendaSlotCandidate = {
    hhmm: string;
    durationMin: number;
};
/**
 * Misma lógica que getAgendaSlotCandidatesForDate pero sin regla 12h / no mismo día (útil para debug y métricas).
 */
export declare function getAgendaSlotCandidatesRaw(professionalId: string, ymd: string): Promise<AgendaSlotCandidate[]>;
/**
 * Cupos teóricos a partir de reglas semanales, bloqueos, citas (ServiceRequest) y
 * slots de agenda materializados ya reservados/en hold.
 * Aplica además: no mismo día, mínimo 12h de anticipación (Chile).
 *
 * @param ymd Fecha calendario en Chile `YYYY-MM-DD` (la misma que envía el frontend con fecha local del paciente).
 */
export declare function getAgendaSlotCandidatesForDate(professionalId: string, ymd: string): Promise<AgendaSlotCandidate[]>;
/**
 * Crea filas faltantes en `availability_slots` para que POST /agenda/requests tenga `slotId` real.
 * No pisa filas BOOKED/HELD; ajusta endAt solo en AVAILABLE (sin hold vigente) si la regla cambió.
 * Idempotente por (professionalId, startAt) con constraint única.
 */
export declare function ensureMaterializedAgendaSlotsForDate(professionalId: string, ymd: string, 
/** Si se pasan (p. ej. ya filtrados con 12h), evita otra ronda de lecturas a BD. */
precomputedCandidates?: AgendaSlotCandidate[]): Promise<{
    candidatesCount: number;
    newRowsCreated: number;
}>;
/**
 * @param ymd Fecha calendario en Chile `YYYY-MM-DD` (la misma que envía el frontend con fecha local del paciente).
 */
export declare function getAvailableSlotsForDate(professionalId: string, ymd: string): Promise<string[]>;
export type MaterializedAgendaSlot = {
    id: string;
    startAt: Date;
    endAt: Date;
};
/**
 * Cupos listos para reservar (filas en `availability_slots` + reglas semanales).
 * Usado por GET /agenda/slots. Genera slots faltantes de forma idempotente.
 */
export declare function listMaterializedAgendaSlotsForDate(professionalId: string, ymd: string, options?: {
    debug?: boolean;
}): Promise<{
    slots: MaterializedAgendaSlot[];
    debug: {
        dayOfWeekChile: number;
        rawCandidates: number;
        afterBookingRules: number;
        newMaterializedRows: number;
        dbAvailableBeforeFilter: number;
    };
}>;
export declare function isSlotAvailable(professionalId: string, dateTime: Date): Promise<boolean>;
export {};
