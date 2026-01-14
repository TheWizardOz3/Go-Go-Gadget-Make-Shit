import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';

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

/**
 * List recent sessions (all projects)
 * GET /api/sessions
 */
router.get('/', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: List sessions' },
  });
});

/**
 * Start a new session
 * POST /api/sessions/new
 * Body: { projectPath: string, prompt?: string }
 */
router.post('/new', validateRequest({ body: newSessionSchema }), (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Start new session' },
  });
});

/**
 * Get session details
 * GET /api/sessions/:id
 */
router.get('/:id', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get session details' },
  });
});

/**
 * Get messages for a session
 * GET /api/sessions/:id/messages
 * Supports ?since=timestamp for incremental updates
 */
router.get('/:id/messages', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get session messages' },
  });
});

/**
 * Send a prompt to a session
 * POST /api/sessions/:id/send
 * Body: { prompt: string }
 */
router.post('/:id/send', validateRequest({ body: sendPromptSchema }), (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Send prompt' },
  });
});

/**
 * Stop a running session/agent
 * POST /api/sessions/:id/stop
 */
router.post('/:id/stop', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Stop session' },
  });
});

export default router;
