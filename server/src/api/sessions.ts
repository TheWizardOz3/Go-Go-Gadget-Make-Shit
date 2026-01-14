import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import {
  getSession,
  getMessages,
  getSessionStatus,
  getRecentSessions,
} from '../services/sessionManager.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

const sendPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt too long'),
});

const newSessionSchema = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  prompt: z.string().optional(),
});

// ============================================================
// Session List & Details
// ============================================================

/**
 * List recent sessions (all projects)
 * GET /api/sessions
 * Query params:
 *   - limit: number (default: 20, max: 100)
 *
 * Returns sessions sorted by most recent activity.
 */
router.get('/', async (req, res) => {
  try {
    const limitParam = req.query.limit;
    let limit = 20;

    if (typeof limitParam === 'string') {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100); // Cap at 100
      }
    }

    const sessions = await getRecentSessions(limit);

    // Serialize Date objects to ISO strings
    const serializedSessions = sessions.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      lastActivityAt: s.lastActivityAt.toISOString(),
    }));

    res.json(success(serializedSessions));
  } catch (err) {
    logger.error('Failed to list sessions', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to list sessions'));
  }
});

/**
 * Get session details
 * GET /api/sessions/:id
 *
 * Returns session metadata including status.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await getSession(id);

    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
      return;
    }

    // Serialize Date objects to ISO strings
    const serializedSession = {
      ...session,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    };

    res.json(success(serializedSession));
  } catch (err) {
    logger.error('Failed to get session', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get session'));
  }
});

/**
 * Get messages for a session
 * GET /api/sessions/:id/messages
 * Query params:
 *   - since: ISO timestamp (optional) - only return messages after this time
 *
 * Supports polling with ?since= for efficient incremental updates.
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const sinceParam = req.query.since;

    // Parse the 'since' parameter if provided
    let since: Date | undefined;
    if (typeof sinceParam === 'string' && sinceParam) {
      const parsedDate = new Date(sinceParam);
      if (!isNaN(parsedDate.getTime())) {
        since = parsedDate;
      } else {
        res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'Invalid since timestamp'));
        return;
      }
    }

    // Check if session exists first
    const session = await getSession(id);
    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
      return;
    }

    const messages = await getMessages(id, since);

    // Serialize Date objects to ISO strings
    const serializedMessages = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));

    // Include session status in response for convenience
    const status = await getSessionStatus(id);

    res.json(
      success({
        messages: serializedMessages,
        status,
        sessionId: id,
      })
    );
  } catch (err) {
    logger.error('Failed to get session messages', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get session messages'));
  }
});

/**
 * Get session status
 * GET /api/sessions/:id/status
 *
 * Returns just the current status (working/waiting/idle).
 * Lightweight endpoint for frequent polling.
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const session = await getSession(id);
    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
      return;
    }

    const status = await getSessionStatus(id);

    res.json(
      success({
        sessionId: id,
        status,
      })
    );
  } catch (err) {
    logger.error('Failed to get session status', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to get session status'));
  }
});

// ============================================================
// Session Control (Placeholders - require Claude CLI integration)
// ============================================================

/**
 * Start a new session
 * POST /api/sessions/new
 * Body: { projectPath: string, prompt?: string }
 *
 * TODO: Implement Claude CLI integration
 */
router.post('/new', validateRequest({ body: newSessionSchema }), (_req, res) => {
  res.status(501).json(error(ErrorCodes.NOT_IMPLEMENTED, 'New session not yet implemented'));
});

/**
 * Send a prompt to a session
 * POST /api/sessions/:id/send
 * Body: { prompt: string }
 *
 * TODO: Implement Claude CLI integration
 */
router.post('/:id/send', validateRequest({ body: sendPromptSchema }), (_req, res) => {
  res.status(501).json(error(ErrorCodes.NOT_IMPLEMENTED, 'Send prompt not yet implemented'));
});

/**
 * Stop a running session/agent
 * POST /api/sessions/:id/stop
 *
 * TODO: Implement process management
 */
router.post('/:id/stop', (_req, res) => {
  res.status(501).json(error(ErrorCodes.NOT_IMPLEMENTED, 'Stop session not yet implemented'));
});

export default router;
