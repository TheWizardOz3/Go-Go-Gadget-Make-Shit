import { Router, type Router as RouterType } from 'express';
import { success } from '../lib/responses.js';

const router: RouterType = Router();

/**
 * Health check endpoint
 * GET /api/status
 *
 * Returns server health status and Claude Code running state
 */
router.get('/', (_req, res) => {
  // For now, just return healthy status
  // Claude running detection will be implemented in a later task
  res.json(
    success({
      healthy: true,
      claudeRunning: false, // Placeholder - will be implemented with Claude service
    })
  );
});

export default router;
