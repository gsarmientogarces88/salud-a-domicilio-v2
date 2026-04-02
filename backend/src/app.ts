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
import laboratoryRoutes from './routes/laboratory.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

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
