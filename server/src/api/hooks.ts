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
  notificationManager,
  type NotificationChannelId,
} from '../services/notifications/index.js';

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
 * Now supports channel-based testing with channel ID and settings
 */
const testNotificationSchema = z.object({
  // Channel ID (defaults to 'imessage' for backward compat)
  channelId: z.enum(['imessage', 'ntfy', 'slack', 'telegram', 'email']).optional(),
  // Channel-specific settings
  phoneNumber: z.string().optional(), // iMessage
  serverUrl: z.string().optional(), // ntfy
  topic: z.string().optional(), // ntfy
  authToken: z.string().optional(), // ntfy
  webhookUrl: z.string().optional(), // Slack
  botToken: z.string().optional(), // Telegram
  chatId: z.string().optional(), // Telegram
  // Legacy field for backward compat
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
 * Triggers notifications on all enabled channels.
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

  // Send notification to all enabled channels
  const projectDisplayName = projectName || 'your project';

  try {
    const results = await notificationManager.sendTaskComplete(projectDisplayName);

    // Log summary of results
    const successCount = Array.from(results.values()).filter((r) => r.success).length;
    const totalCount = results.size;

    if (successCount > 0) {
      logger.info('Notifications triggered from hook', {
        successCount,
        totalCount,
        channels: Array.from(results.entries())
          .filter(([, r]) => r.success)
          .map(([id]) => id),
      });
    } else if (totalCount > 0) {
      logger.debug('No notifications sent (all skipped or failed)', {
        totalCount,
      });
    }
  } catch (err) {
    // Already logged in NotificationManager, just note it here
    logger.debug('Notification processing completed with error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * Test notification endpoint (legacy)
 * POST /api/notifications/test
 *
 * Sends a test notification to verify the setup is working.
 * Bypasses rate limiting.
 *
 * Supports both legacy format (phoneNumber only) and new format (channelId + settings).
 */
router.post(
  '/notifications/test',
  validateRequest({ body: testNotificationSchema }),
  async (req, res) => {
    const {
      channelId = 'imessage', // Default to iMessage for backward compat
      phoneNumber,
      serverUrl,
      topic,
      authToken,
      webhookUrl,
      botToken,
      chatId,
    } = req.body;

    logger.info('Test notification requested', {
      channelId,
      hasPhoneNumber: !!phoneNumber,
      hasServerUrl: !!serverUrl,
    });

    // Build channel-specific settings
    let channelSettings: Record<string, unknown>;

    switch (channelId as NotificationChannelId) {
      case 'imessage':
        if (!phoneNumber) {
          res
            .status(400)
            .json(error(ErrorCodes.VALIDATION_ERROR, 'Phone number is required for iMessage'));
          return;
        }
        channelSettings = { enabled: true, phoneNumber };
        break;

      case 'ntfy':
        if (!serverUrl || !topic) {
          res
            .status(400)
            .json(error(ErrorCodes.VALIDATION_ERROR, 'Server URL and topic are required for ntfy'));
          return;
        }
        channelSettings = { enabled: true, serverUrl, topic, authToken };
        break;

      case 'slack':
        if (!webhookUrl) {
          res
            .status(400)
            .json(error(ErrorCodes.VALIDATION_ERROR, 'Webhook URL is required for Slack'));
          return;
        }
        channelSettings = { enabled: true, webhookUrl };
        break;

      case 'telegram':
        if (!botToken || !chatId) {
          res
            .status(400)
            .json(
              error(ErrorCodes.VALIDATION_ERROR, 'Bot token and chat ID are required for Telegram')
            );
          return;
        }
        channelSettings = { enabled: true, botToken, chatId };
        break;

      default:
        res
          .status(400)
          .json(error(ErrorCodes.VALIDATION_ERROR, `Unsupported channel: ${channelId}`));
        return;
    }

    try {
      const result = await notificationManager.sendTest(
        channelId as NotificationChannelId,
        channelSettings
      );

      if (result.success) {
        res.json(success({ sent: true, message: 'Test notification sent', channelId }));
      } else {
        const errorMessage = result.error || 'Failed to send test notification';
        res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, errorMessage));
      }
    } catch (err) {
      logger.error('Test notification failed', {
        channelId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'Failed to send test notification'));
    }
  }
);

/**
 * Channel-specific test notification schema
 */
const channelTestSchema = z.object({
  channelId: z.enum(['imessage', 'ntfy', 'slack', 'telegram', 'email']),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Test notification endpoint (new channel-based)
 * POST /api/notifications/:channelId/test
 *
 * Sends a test notification to a specific channel.
 * Settings object is passed in body for flexibility.
 */
router.post(
  '/notifications/:channelId/test',
  validateRequest({ body: channelTestSchema }),
  async (req, res) => {
    const { channelId, settings = {} } = req.body;

    logger.info('Channel test notification requested', {
      channelId,
      hasSettings: Object.keys(settings).length > 0,
    });

    // Validate the channelId is one we support
    const validChannels: NotificationChannelId[] = [
      'imessage',
      'ntfy',
      'slack',
      'telegram',
      'email',
    ];
    if (!validChannels.includes(channelId as NotificationChannelId)) {
      res.status(400).json(error(ErrorCodes.VALIDATION_ERROR, `Unsupported channel: ${channelId}`));
      return;
    }

    // Mark as enabled for testing (settings from body won't have enabled=true by default)
    const channelSettings = { ...settings, enabled: true };

    try {
      const result = await notificationManager.sendTest(
        channelId as NotificationChannelId,
        channelSettings
      );

      if (result.success) {
        res.json(success({ sent: true, message: `Test notification sent via ${channelId}` }));
      } else {
        const errorMessage =
          result.error || result.skipReason || 'Failed to send test notification';
        res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, errorMessage));
      }
    } catch (err) {
      logger.error('Channel test notification failed', {
        channelId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      res
        .status(500)
        .json(
          error(ErrorCodes.INTERNAL_ERROR, `Failed to send test notification via ${channelId}`)
        );
    }
  }
);

export default router;
