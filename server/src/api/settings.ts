/**
 * Settings API Routes
 *
 * Endpoints for managing app settings (notifications, theme, etc.)
 */

import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import { getSettings, updateSettings } from '../services/settingsService.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

/**
 * Schema for updating settings (all fields optional)
 */
const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationPhoneNumber: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  // defaultTemplates intentionally omitted - managed separately
});

// ============================================================
// Routes
// ============================================================

/**
 * Get app settings
 * GET /api/settings
 *
 * Returns current app settings from ~/.gogogadgetclaude/settings.json
 */
router.get('/', async (_req, res) => {
  try {
    const settings = await getSettings();

    logger.debug('Retrieved settings');

    res.json(success(settings));
  } catch (err) {
    logger.error('Failed to get settings', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to load settings'));
  }
});

/**
 * Update app settings
 * PUT /api/settings
 *
 * Accepts partial settings update. Only provided fields are updated.
 *
 * Body:
 * {
 *   "notificationsEnabled"?: boolean,
 *   "notificationPhoneNumber"?: string,
 *   "theme"?: "light" | "dark" | "system"
 * }
 */
router.put('/', validateRequest({ body: updateSettingsSchema }), async (req, res) => {
  try {
    const updates = req.body;

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      res.status(400).json(error(ErrorCodes.BAD_REQUEST, 'No settings provided to update'));
      return;
    }

    const updatedSettings = await updateSettings(updates);

    logger.info('Settings updated', {
      fields: Object.keys(updates),
    });

    res.json(success(updatedSettings));
  } catch (err) {
    logger.error('Failed to update settings', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    // Check if it's a validation error from the service
    if (err instanceof Error && err.message.startsWith('Invalid settings:')) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, err.message));
      return;
    }

    res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to save settings'));
  }
});

export default router;
