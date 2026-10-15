import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import { sql } from 'drizzle-orm';
import { db, isDbConfigured } from './db';

// Stripe related import add here

//import api routes here
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import musicRoutes from './routes/music';
import plazaRoutes from './routes/plaza';

// Configuration
import { SERVER_CONFIG } from './config/constants';

// Middleware
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Omniflow embedded preview API compatibility
// Generated previews run in an isolated iframe origin. APIs use bearer tokens,
// so cross-origin cookies and credentials are intentionally not enabled.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

/**
 * Static Files
 */
const REACT_BUILD_FOLDER = path.join(__dirname, '..', 'frontend', 'dist');
app.use(
  express.static(REACT_BUILD_FOLDER, {
    setHeaders: (res, path) => {
      // Disable caching for CSS and JS files to ensure changes are reflected immediately
      if (path.endsWith('.css') || path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

app.use(
  '/assets',
  express.static(path.join(REACT_BUILD_FOLDER, 'assets'), {
    setHeaders: (res, path) => {
      // Disable caching for CSS and JS files in assets folder
      if (path.endsWith('.css') || path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

// API Routes import here

/**
 * API Routes
 */
app.use(express.json({ limit: '2mb' }));
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/plaza', plazaRoutes);

/**
 * Install Stripe Routes here
 */

/**
 * SPA Fallback Route
 * Handles client-side routing for React Router
 * Must be registered after all API routes
 */
app.get('*', (_req, res) => {
  res.sendFile(path.join(REACT_BUILD_FOLDER, 'index.html'));
});

/**
 * Error Handler
 * Must be the last middleware
 */
app.use(errorHandler as ErrorRequestHandler);

/**
 * 启动时执行幂等迁移：把 music.duration 从 integer 改为 real（Suno 返回浮点时长）
 * integer → real 是安全的加宽转换，已有数据不受影响。重复执行无副作用。
 */
async function runMigrations() {
  if (!isDbConfigured()) return;
  try {
    await db.execute(sql`ALTER TABLE IF EXISTS music ALTER COLUMN duration TYPE real`);
    console.log('[migration] music.duration 已确保为 real 类型');
  } catch (err) {
    console.error('[migration] duration 列类型调整失败（可能已为 real）:', err instanceof Error ? err.message : err);
  }
}
void runMigrations();

/**
 * Start Server
 */
app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
});

export default app;
