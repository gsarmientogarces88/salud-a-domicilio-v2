import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import type { Request, Response, NextFunction } from 'express';

import authRoutes from './routes/auth.routes';
import servicesRoutes from './routes/services.routes';
import paymentsRoutes from './routes/payments.routes';
import adminRoutes from './routes/admin.routes';
import doctorRoutes from './routes/doctor.routes';
import schedulingRoutes from './routes/scheduling.routes';
import professionalsRoutes from './routes/professionals.routes';
import agendaRoutes from './routes/agenda.routes';
import laboratoriesPublicRoutes from './routes/laboratories.public.routes';
import patientLabRoutes from './routes/patientLab.routes';
import patientNotificationsRoutes from './routes/patientNotifications.routes';
import patientProfileRoutes from './routes/patientProfile.routes';
import laboratoryRoutes from './routes/laboratory.routes';
import publicRoutes from './routes/public.routes';

const app = express();

function allowedOrigins(): string[] {
  const fromEnv = [config.frontendUrl, process.env.FRONTEND_URLS || '']
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const extras: string[] = [];
  for (const origin of fromEnv) {
    extras.push(origin);
    try {
      const u = new URL(origin);
      if (u.hostname === 'medicilio.cl') extras.push(`${u.protocol}//www.medicilio.cl`);
      if (u.hostname === 'www.medicilio.cl') extras.push(`${u.protocol}//medicilio.cl`);
    } catch {
      // ignore invalid origins
    }
  }
  return Array.from(new Set(extras));
}

const origins = allowedOrigins();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      if (config.isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Público (landing)
app.use('/api/public', publicRoutes);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/laboratories', laboratoriesPublicRoutes);
app.use('/api/patient/lab-exams', patientLabRoutes);
app.use('/api/patient', patientProfileRoutes);
app.use('/api/patient', patientNotificationsRoutes);
app.use('/api/laboratory', laboratoryRoutes);

// Error handler global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message || err);
  res.status(err.status || 500).json({
    error: true,
    message: config.isDev ? err.message : 'Error interno',
  });
});

export default app;
