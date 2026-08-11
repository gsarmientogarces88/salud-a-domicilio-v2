import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  /** Logs `[serviceFlow.*]` en consola (complete/start y snapshot tras cerrar). */
  debugServiceStateFlow: process.env.DEBUG_SERVICE_STATE_FLOW === '1',
  serviceRequests: {
    urgentPendingTtlMinutes: parseInt(process.env.SERVICE_REQUEST_URGENT_PENDING_TTL_MINUTES || '10'),
    scheduledPendingTtlMinutes: parseInt(process.env.SERVICE_REQUEST_SCHEDULED_PENDING_TTL_MINUTES || '10'),
    /** IN_PROGRESS → COMPLETED automático si `startedAt` supera este límite (minutos). */
    inProgressAutoCompleteAfterMinutes: parseInt(
      process.env.SERVICE_REQUEST_IN_PROGRESS_AUTO_COMPLETE_MINUTES || '100'
    ),
  },
  labExams: {
    quoteDeadlineMinutes: parseInt(process.env.LAB_EXAM_QUOTE_DEADLINE_MINUTES || '90'),
  },
  geo: {
    urgentProximityFilterEnabled: (process.env.GEO_URGENT_PROXIMITY_FILTER_ENABLED || 'true') === 'true',
    urgentRadiusKm: parseFloat(process.env.GEO_URGENT_RADIUS_KM || '15'),
    minAccuracyMetersApp: parseInt(process.env.GEO_MIN_ACCURACY_METERS_APP || '200'),
    minAccuracyMetersWeb: parseInt(process.env.GEO_MIN_ACCURACY_METERS_WEB || '500'),
    ttlSecondsApp: parseInt(process.env.GEO_TTL_SECONDS_APP || '300'),
    ttlSecondsWeb: parseInt(process.env.GEO_TTL_SECONDS_WEB || '1200'),
  },
} as const;
