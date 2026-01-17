/**
 * Notification Service (Facade)
 *
 * This file re-exports from the new notifications module for backward compatibility.
 * New code should import from '../services/notifications/index.js' directly.
 *
 * @deprecated Import from '../services/notifications/index.js' instead
 */

import { logger } from '../lib/logger.js';
import {
  notificationManager,
  sendTaskCompleteNotification as sendTaskComplete,
  type NotificationResult,
  type RateLimitStatus,
} from './notifications/index.js';

// ============================================================
// Backward-Compatible Exports
// ============================================================

/**
 * Send a task completion notification via iMessage
 *
 * @deprecated Use notificationManager.sendTaskComplete() instead
 * @param projectName - Name of the project that completed
 * @returns true if notification was sent, false if skipped
 */
export async function sendTaskCompleteNotification(projectName: string): Promise<boolean> {
  return sendTaskComplete(projectName);
}

/**
 * Send a test notification
 *
 * @deprecated Use notificationManager.sendTest('imessage', settings) instead
 * @param phoneNumber - Phone number to send test to
 * @param serverHostname - Optional hostname for the app URL
 * @returns true if test notification was sent successfully
 */
export async function sendTestNotification(
  phoneNumber: string,
  _serverHostname?: string
): Promise<boolean> {
  const result: NotificationResult = await notificationManager.sendTest('imessage', {
    enabled: true,
    phoneNumber,
  });

  return result.success;
}

/**
 * Get the current rate limit status
 *
 * @deprecated Use notificationManager.getChannel('imessage')?.getRateLimitStatus() instead
 * @returns Object with rate limit info
 */
export function getRateLimitStatus(): RateLimitStatus {
  const channel = notificationManager.getChannel('imessage');
  if (!channel) {
    return {
      isLimited: false,
      lastNotificationTime: null,
      secondsUntilReset: null,
    };
  }
  return channel.getRateLimitStatus();
}

/**
 * Reset rate limiting (for testing)
 *
 * @deprecated Use notificationManager.getChannel('imessage')?.resetRateLimit() instead
 */
export function resetRateLimit(): void {
  const channel = notificationManager.getChannel('imessage');
  if (channel) {
    channel.resetRateLimit();
    logger.debug('Rate limit reset (via legacy facade)');
  }
}

// ============================================================
// Re-exports for convenience
// ============================================================

export { notificationManager } from './notifications/index.js';
