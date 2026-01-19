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
import { sendPrompt, stopAgent, startNewSession } from '../services/claudeService.js';
import { updateSettings } from '../services/settingsService.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

const imageAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  base64: z.string().min(1),
});

const sendPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt too long'),
  imageAttachment: imageAttachmentSchema.optional(),
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
 * Spawns claude CLI without --continue to create a fresh session.
 * The new session ID will be generated by Claude Code.
 * Client should poll /api/projects/:path/sessions to discover the new session.
 */
router.post('/new', validateRequest({ body: newSessionSchema }), async (req, res) => {
  try {
    const { projectPath, prompt } = req.body as z.infer<typeof newSessionSchema>;

    logger.info('Starting new session', {
      projectPath,
      hasPrompt: !!prompt,
    });

    // Start new session via Claude CLI
    const result = await startNewSession({
      projectPath,
      prompt,
    });

    if (!result.success) {
      logger.error('Failed to start new session', {
        projectPath,
        error: result.error,
      });
      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to start new session'));
      return;
    }

    // Track last active project for global scheduled prompts
    await updateSettings({ lastActiveProjectPath: projectPath }).catch((err) => {
      logger.warn('Failed to update last active project', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    res.status(201).json(
      success({
        success: true,
        pid: result.pid,
        message: 'New session started. Poll for sessions to discover the new session ID.',
      })
    );
  } catch (err) {
    logger.error('Failed to start new session', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to start new session'));
  }
});

/**
 * Send a prompt to a session
 * POST /api/sessions/:id/send
 * Body: { prompt: string }
 *
 * Spawns claude CLI with the prompt and returns immediately.
 * Claude writes to JSONL, which will be picked up by our watcher.
 */
router.post('/:id/send', validateRequest({ body: sendPromptSchema }), async (req, res) => {
  try {
    // req.params.id is typed as string | string[] in Express 5 types, but with our
    // route definition it's always a string. Cast to ensure TypeScript is happy.
    const id = req.params.id as string;
    // Body is validated by sendPromptSchema, so prompt is guaranteed to be a string
    const { prompt, imageAttachment } = req.body as z.infer<typeof sendPromptSchema>;

    // Get session to find project path
    const session = await getSession(id);
    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
      return;
    }

    // Send prompt via Claude CLI
    const result = await sendPrompt({
      sessionId: id,
      projectPath: session.projectPath,
      prompt,
      imageAttachment,
    });

    if (!result.success) {
      logger.error('Failed to send prompt', {
        sessionId: id,
        error: result.error,
      });
      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to send prompt'));
      return;
    }

    // Track last active project for global scheduled prompts
    await updateSettings({ lastActiveProjectPath: session.projectPath }).catch((err) => {
      logger.warn('Failed to update last active project', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    res.json(
      success({
        success: true,
        sessionId: id,
        pid: result.pid,
      })
    );
  } catch (err) {
    logger.error('Failed to send prompt', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to send prompt'));
  }
});

/**
 * Stop a running session/agent
 * POST /api/sessions/:id/stop
 *
 * Attempts to gracefully stop the Claude Code process for the session.
 * Uses escalating signals: SIGINT → SIGTERM → SIGKILL
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const id = req.params.id as string;

    // Validate session exists
    const session = await getSession(id);
    if (!session) {
      res.status(404).json(error(ErrorCodes.NOT_FOUND, 'Session not found'));
      return;
    }

    // Attempt to stop the agent
    const result = await stopAgent({ sessionId: id });

    if (!result.success) {
      logger.error('Failed to stop agent', {
        sessionId: id,
        error: result.error,
      });
      res
        .status(500)
        .json(error(ErrorCodes.INTERNAL_ERROR, result.error || 'Failed to stop agent'));
      return;
    }

    res.json(
      success({
        success: true,
        sessionId: id,
        processKilled: result.processKilled,
        pid: result.pid,
        signal: result.signal,
        message: result.message,
      })
    );
  } catch (err) {
    logger.error('Failed to stop agent', {
      sessionId: req.params.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to stop agent'));
  }
});

export default router;
