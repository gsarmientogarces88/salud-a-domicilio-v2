import 'dotenv/config';
export declare const config: {
    readonly port: number;
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
    readonly frontendUrl: string;
    readonly nodeEnv: string;
    readonly isDev: boolean;
    /** Logs `[serviceFlow.*]` en consola (complete/start y snapshot tras cerrar). */
    readonly debugServiceStateFlow: boolean;
    readonly serviceRequests: {
        readonly urgentPendingTtlMinutes: number;
        readonly scheduledPendingTtlMinutes: number;
        /** IN_PROGRESS → COMPLETED automático si `startedAt` supera este límite (minutos). */
        readonly inProgressAutoCompleteAfterMinutes: number;
    };
    readonly labExams: {
        readonly quoteDeadlineMinutes: number;
    };
    readonly geo: {
        readonly urgentProximityFilterEnabled: boolean;
        readonly urgentRadiusKm: number;
        readonly minAccuracyMetersApp: number;
        readonly minAccuracyMetersWeb: number;
        readonly ttlSecondsApp: number;
        readonly ttlSecondsWeb: number;
    };
};
