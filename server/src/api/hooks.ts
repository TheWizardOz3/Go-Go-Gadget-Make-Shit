/**
 * Hooks API Routes
 *
 * Endpoints for Claude Code hooks to trigger notifications and other actions.
 * These endpoints are called by hook scripts configured in Claude Code.
 */

import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success, error, ErrorCodes } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import {
  sendTaskCompleteNotification,
  sendTestNotification,
} from '../services/notificationService.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

/**
 * Schema for task-complete hook payload
 * The hook script sends: { event: "stop", timestamp: "ISO-8601" }
 * Project name is optional (may be added to hook script later)
 */
const taskCompleteSchema = z.object({
  event: z.string().optional(),
  timestamp: z.string().optional(),
  projectName: z.string().optional(),
});

/**
 * Schema for test notification request
 */
const testNotificationSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  serverHostname: z.string().optional(),
});

// ============================================================
// Routes
// ============================================================

/**
 * Task completion hook
 * POST /api/hooks/task-complete
 *
 * Called by Claude Code's Stop hook when a task completes.
 * Triggers an iMessage notification if enabled in settings.
 *
 * Returns 200 immediately to avoid blocking Claude Code.
 */
router.post('/task-complete', validateRequest({ body: taskCompleteSchema }), async (req, res) => {
  // Respond immediately - don't block Claude Code
  res.json(success({ received: true }));

  // Process notification asynchronously
  const { event, timestamp, projectName } = req.body;

  logger.info('Task completion hook received', {
    event,
    timestamp,
    projectName,
  });

  // Send notification (handles settings check and rate limiting internally)
  const projectDisplayName = projectName || 'your project';

  try {
    const sent = await sendTaskCompleteNotification(projectDisplayName);
    if (sent) {
      logger.info('Notification triggered from hook');
    }
  } catch {
    // Already logged in notificationService, just note it here
    logger.debug('Notification processing completed with error');
  }
});

/**
 * Test notification endpoint
 * POST /api/notifications/test
 *
 * Sends a test notification to verify the setup is working.
 * Bypasses rate limiting.
 */
router.post(
  '/notifications/test',
  validateRequest({ body: testNotificationSchema }),
  async (req, res) => {
    const { phoneNumber, serverHostname } = req.body;

    logger.info('Test notification requested', {
      phoneNumber: phoneNumber.slice(0, 4) + '****',
      serverHostname: serverHostname || 'default',
    });

    try {
      const sent = await sendTestNotification(phoneNumber, serverHostname);

      if (sent) {
        res.json(success({ sent: true, message: 'Test notification sent' }));
      } else {
        res
          .status(500)
          .json(
            error(
              ErrorCodes.INTERNAL_ERROR,
              'Failed to send test notification. Check that Messages.app is set up correctly.'
            )
          );
      }
    } catch (err) {
      logger.error('Test notification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to send test notification'));
    }
  }
);

export default router;
