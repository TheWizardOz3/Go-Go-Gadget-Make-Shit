import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

/**
 * Get app settings
 * GET /api/settings
 */
router.get('/', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Get settings' },
  });
});

/**
 * Update app settings
 * PUT /api/settings
 */
router.put('/', (_req, res) => {
  res.status(501).json({
    data: { message: 'Not implemented: Update settings' },
  });
});

export default router;
