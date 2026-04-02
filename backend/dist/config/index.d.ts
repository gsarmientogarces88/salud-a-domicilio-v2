import 'dotenv/config';
export declare const config: {
    readonly port: number;
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
    readonly frontendUrl: string;
    readonly nodeEnv: string;
    readonly isDev: boolean;
    readonly geo: {
        readonly urgentProximityFilterEnabled: boolean;
        readonly urgentRadiusKm: number;
        readonly minAccuracyMetersApp: number;
        readonly minAccuracyMetersWeb: number;
        readonly ttlSecondsApp: number;
        readonly ttlSecondsWeb: number;
    };
};
