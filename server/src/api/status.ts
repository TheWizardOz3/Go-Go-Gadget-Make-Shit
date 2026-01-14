import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

/**
 * Health check endpoint
 * GET /api/status
 *
 * Returns server health status and Claude Code running state
 * Response format per architecture spec: { data: { healthy: boolean, claudeRunning: boolean } }
 */
router.get('/', (_req, res) => {
  // For now, just return healthy status
  // Claude running detection will be implemented in a later task
  res.json({
    data: {
      healthy: true,
      claudeRunning: false, // Placeholder - will be implemented with Claude service
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
