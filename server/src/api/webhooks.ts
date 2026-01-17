/**
 * Webhook API Routes
 *
 * Handles incoming webhooks from external services:
 * - Modal cloud job completion callbacks
 * - Future: GitHub webhooks, etc.
 *
 * Routes:
 *   POST /api/webhooks/cloud-job-complete - Receive Modal job completion
 */

import { Router, type Router as RouterType } from 'express';
import { validateRequest, z } from '../middleware/validateRequest.js';
import { success } from '../lib/responses.js';
import { logger } from '../lib/logger.js';
import { sendTaskCompleteNotification } from '../services/notifications/index.js';

const router: RouterType = Router();

// ============================================================
// Validation Schemas
// ============================================================

const cloudJobCompleteSchema = z.object({
  type: z.literal('task-complete'),
  projectName: z.string().min(1, 'Project name is required'),
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
});

// ============================================================
// Types
// ============================================================

interface CloudJobCompletePayload {
  type: 'task-complete';
  projectName: string;
  success: boolean;
  sessionId?: string;
  error?: string;
}

// ============================================================
// Webhook Endpoints
// ============================================================

/**
 * Receive cloud job completion webhook from Modal
 * POST /api/webhooks/cloud-job-complete
 *
 * This endpoint is called by Modal when a cloud-executed Claude job
 * completes (either successfully or with failure).
 *
 * The endpoint triggers the notification system to alert the user
 * through all enabled notification channels.
 *
 * Body: {
 *   type: "task-complete",
 *   projectName: string,
 *   success: boolean,
 *   sessionId?: string,
 *   error?: string
 * }
 */
router.post(
  '/cloud-job-complete',
  validateRequest({ body: cloudJobCompleteSchema }),
  async (req, res) => {
    const payload = req.body as CloudJobCompletePayload;

    logger.info('Received cloud job completion webhook', {
      projectName: payload.projectName,
      success: payload.success,
      sessionId: payload.sessionId,
      hasError: !!payload.error,
    });

    try {
      // Send notification to all enabled channels
      const notificationSent = await sendTaskCompleteNotification(payload.projectName);

      if (notificationSent) {
        logger.info('Cloud job completion notification sent', {
          projectName: payload.projectName,
        });
      } else {
        logger.debug(
          'Cloud job completion notification skipped (rate limited or no channels enabled)',
          {
            projectName: payload.projectName,
          }
        );
      }

      // Return success even if notification was skipped (job completed regardless)
      res.json(
        success({
          received: true,
          notificationSent,
          projectName: payload.projectName,
          success: payload.success,
        })
      );
    } catch (err) {
      logger.error('Failed to process cloud job completion webhook', {
        projectName: payload.projectName,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      // Still return 200 to acknowledge receipt (Modal shouldn't retry)
      // The notification failure shouldn't cause the webhook to fail
      res.json(
        success({
          received: true,
          notificationSent: false,
          error: err instanceof Error ? err.message : 'Notification failed',
          projectName: payload.projectName,
          success: payload.success,
        })
      );
    }
  }
);

/**
 * Health check for webhook endpoint
 * GET /api/webhooks/health
 *
 * Used by Modal or other services to verify the webhook endpoint is reachable.
 */
router.get('/health', (_req, res) => {
  res.json(
    success({
      status: 'ok',
      service: 'gogogadget-webhooks',
      timestamp: new Date().toISOString(),
    })
  );
});

export default router;
