import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { pool } from './config/database';
import { runMigrations } from './config/migrate';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

const app = express();

// ── Security & middleware ───────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Static file serving (uploads) ──────────────────────────
app.use('/uploads', express.static(config.uploads.dir));

// ── Swagger / OpenAPI ───────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plant Management System API',
      version: '1.0.0',
      description: 'REST API for Smart Home Plant Management System',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'Plants', description: 'Plant registry' },
      { name: 'Locations', description: 'Plant locations' },
      { name: 'CareLogs', description: 'Care history' },
      { name: 'AI', description: 'AI diagnostics & identification' },
      { name: 'Knowledge', description: 'Plant knowledge database' },
      { name: 'Settings', description: 'System configuration' },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ── Health ping ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Error handler ───────────────────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────
async function start() {
  let retries = 10;
  while (retries--) {
    try {
      await pool.query('SELECT 1');
      console.log('[db] Connected to PostgreSQL');
      break;
    } catch (err) {
      if (retries === 0) throw err;
      console.log(`[db] Waiting for PostgreSQL... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  await runMigrations();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[api] Server running on port ${config.port}`);
    console.log(`[api] Swagger docs: http://localhost:${config.port}/api/docs`);
    console.log(`[api] Environment: ${config.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
