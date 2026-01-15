import 'dotenv/config';
import fs from 'node:fs';
import https from 'node:https';
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
// Assets with hashes can be cached long-term, HTML should not be cached
app.use(
  express.static(CLIENT_DIST_PATH, {
    // Cache hashed assets (JS, CSS) for 1 year
    // HTML files should not be cached (handled by catch-all below)
    setHeaders: (res, filePath) => {
      if (filePath.includes('/assets/')) {
        // Hashed assets - cache for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Other static files - short cache
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// SPA catch-all: serve index.html for any non-API routes
// This enables client-side routing (React Router)
// No cache for HTML to ensure users get the latest version
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});

// ============================================================
// Error Handling (must be last)
// ============================================================
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================

/**
 * Start the file watcher and session cache invalidation
 */
function initializeWatcher() {
  startWatching();
  onSessionChange((sessionId, eventType) => {
    logger.debug('Session file changed, invalidating cache', { sessionId, eventType });
    invalidateSessionCache(sessionId);
  });
}

// When HTTPS is enabled:
//   - HTTPS runs on main port (3456) - for iOS voice input
//   - HTTP runs on secondary port (3457) - for local dev without certs
// When HTTPS is not enabled:
//   - HTTP runs on main port (3456)

if (config.httpsEnabled) {
  // HTTPS mode: HTTPS on main port, HTTP on secondary
  try {
    const httpsOptions = {
      key: fs.readFileSync(config.sslKeyPath),
      cert: fs.readFileSync(config.sslCertPath),
    };

    // Start HTTPS on main port (3456)
    https.createServer(httpsOptions, app).listen(PORT, () => {
      logger.info('GoGoGadgetClaude HTTPS server started (primary)', {
        port: PORT,
        url: `https://localhost:${PORT}`,
        healthCheck: `https://localhost:${PORT}/api/status`,
        voiceInput: '✅ Voice input enabled (secure context)',
      });

      initializeWatcher();
    });

    // Start HTTP on secondary port (3457) for convenience
    app.listen(config.httpPort, () => {
      logger.info('GoGoGadgetClaude HTTP server started (secondary)', {
        port: config.httpPort,
        url: `http://localhost:${config.httpPort}`,
        note: 'Voice input requires HTTPS - use main port for iOS',
      });
    });
  } catch (err) {
    logger.error('Failed to start HTTPS server - check SSL certificate paths', {
      sslCertPath: config.sslCertPath,
      sslKeyPath: config.sslKeyPath,
      error: err instanceof Error ? err.message : String(err),
    });
    logger.info('Falling back to HTTP-only mode...');

    // Fall back to HTTP on main port
    app.listen(PORT, () => {
      logger.info('GoGoGadgetClaude HTTP server started (fallback)', {
        port: PORT,
        url: `http://localhost:${PORT}`,
        warning: '⚠️ Voice input will not work on iOS - fix SSL cert paths',
      });
      initializeWatcher();
    });
  }
} else {
  // HTTP-only mode
  app.listen(PORT, () => {
    logger.info('GoGoGadgetClaude HTTP server started', {
      port: PORT,
      url: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/api/status`,
      note: '⚠️ Voice input requires HTTPS - run scripts/setup-https.sh',
    });
    initializeWatcher();
  });
}
