import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import type { Request, Response, NextFunction } from 'express';

import authRoutes from './routes/auth.routes';
import servicesRoutes from './routes/services.routes';
import paymentsRoutes from './routes/payments.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json());

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// Error handler global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message || err);
  res.status(err.status || 500).json({
    error: true,
    message: config.isDev ? err.message : 'Error interno',
  });
});

export default app;
