import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import apiRouter from './api/index.js';
import { errorHandler, apiNotFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { startWatching, onSessionChange } from './lib/fileWatcher.js';
import { invalidateSessionCache } from './services/sessionManager.js';

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to built React app (relative to server/src/)
const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

const app = express();
const PORT = config.port;

// ============================================================
// Middleware Stack (order matters!)
// ============================================================

// 1. CORS - Allow cross-origin requests (Tailscale is the security boundary)
app.use(
  cors({
    origin: true, // Reflect request origin (allows all origins)
    credentials: true,
  })
);

// 2. JSON Body Parser - Parse JSON request bodies with size limit
app.use(
  express.json({
    limit: '10mb', // Accommodate voice recordings and large prompts
  })
);

// 3. Request Logger - Log all incoming requests
app.use(requestLogger);

// ============================================================
// API Routes
// ============================================================
app.use('/api', apiRouter);

// API 404 handler - must be after API routes but before static serving
// Returns JSON error for unmatched /api/* requests
app.use('/api', apiNotFoundHandler);

// ============================================================
// Static File Serving (Production)
// ============================================================
// Serve built React app from client/dist
app.use(express.static(CLIENT_DIST_PATH));

// SPA catch-all: serve index.html for any non-API routes
// This enables client-side routing (React Router)
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});

// ============================================================
// Error Handling (must be last)
// ============================================================
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  logger.info('GoGoGadgetClaude server started', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/api/status`,
  });

  // Start file watcher for JSONL session files
  startWatching();

  // Invalidate cache when session files change
  onSessionChange((sessionId, eventType) => {
    logger.debug('Session file changed, invalidating cache', { sessionId, eventType });
    invalidateSessionCache(sessionId);
  });
});
