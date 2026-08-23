import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import counterRoutes from './routes/counterRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { clientOrigins, trustProxy, isProduction } from './config/env.js';

const app = express();

if (trustProxy) app.set('trust proxy', trustProxy);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Basic protection against ticket-spamming / brute force on public endpoints
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/public', publicLimiter);

// Scoped to the credential-guessing endpoints only — /me and
// /change-password already require a valid JWT, so brute force isn't the
// threat there. Bundling them into one /api/auth-wide limiter meant the
// routine "am I still logged in" check every page load makes competed
// with actual login attempts for the same 20-request budget, which is
// what was producing 429s during normal use/dev testing rather than abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(
  ['/api/auth/signup', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password'],
  authLimiter
);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
