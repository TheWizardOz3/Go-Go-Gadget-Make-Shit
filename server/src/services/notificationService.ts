/**
 * Notification Service
 *
 * Sends iMessage notifications via macOS AppleScript when Claude Code completes tasks.
 * Includes rate limiting to prevent notification spam.
 */

import { execa } from 'execa';
import { logger } from '../lib/logger.js';
import { config } from '../lib/config.js';
import { getSettings } from './settingsService.js';

// ============================================================
// Constants
// ============================================================

/** Minimum time between notifications in milliseconds (60 seconds) */
const RATE_LIMIT_MS = 60 * 1000;

// ============================================================
// State (in-memory)
// ============================================================

/** Timestamp of the last notification sent */
let lastNotificationTime: number | null = null;

// ============================================================
// Internal Functions
// ============================================================

/**
 * Check if we're rate limited
 * @returns true if a notification was sent within the rate limit window
 */
function isRateLimited(): boolean {
  if (lastNotificationTime === null) {
    return false;
  }

  const timeSinceLast = Date.now() - lastNotificationTime;
  return timeSinceLast < RATE_LIMIT_MS;
}

/**
 * Build the app URL for the notification message
 * @param serverHostname - Optional hostname/URL from settings
 */
function getAppUrl(serverHostname?: string): string {
  const hostnameOrUrl = serverHostname || config.tailscaleHostname;
  const port = config.port;

  // If the hostname already includes a protocol, use it as-is (just append port if needed)
  if (hostnameOrUrl.startsWith('http://') || hostnameOrUrl.startsWith('https://')) {
    // Check if port is already included
    if (hostnameOrUrl.includes(':' + port) || hostnameOrUrl.match(/:\d+$/)) {
      return hostnameOrUrl;
    }
    return `${hostnameOrUrl}:${port}`;
  }

  // No protocol - use https if HTTPS is enabled, otherwise http
  const protocol = config.httpsEnabled ? 'https' : 'http';
  return `${protocol}://${hostnameOrUrl}:${port}`;
}

/**
 * Build the notification message
 * @param projectName - Name of the project
 * @param serverHostname - Optional hostname from settings
 */
function buildMessage(projectName: string, serverHostname?: string): string {
  const url = getAppUrl(serverHostname);
  return `🤖 GoGoGadgetClaude: Task complete in ${projectName}.\n${url}`;
}

/**
 * Build the AppleScript command to send an iMessage
 *
 * Note: This uses Messages.app's AppleScript interface.
 * The recipient must be a valid phone number or email associated with iMessage.
 */
function buildAppleScript(phoneNumber: string, message: string): string {
  // Escape any special characters in the message for AppleScript
  const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  // AppleScript to send iMessage
  // Uses 'text chat' approach which is more reliable than 'buddy'
  return `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${phoneNumber}" of targetService
      send "${escapedMessage}" to targetBuddy
    end tell
  `;
}

/**
 * Execute AppleScript via osascript
 */
async function executeAppleScript(script: string): Promise<void> {
  await execa('osascript', ['-e', script], {
    timeout: 10000, // 10 second timeout
    reject: true,
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Send a task completion notification via iMessage
 *
 * Checks if notifications are enabled in settings, applies rate limiting,
 * and sends an iMessage with the project name and app URL.
 *
 * @param projectName - Name of the project that completed
 * @returns true if notification was sent, false if skipped (disabled, rate limited, or error)
 */
export async function sendTaskCompleteNotification(projectName: string): Promise<boolean> {
  try {
    // Check settings
    const settings = await getSettings();

    if (!settings.notificationsEnabled) {
      logger.debug('Notifications disabled, skipping', { projectName });
      return false;
    }

    if (!settings.notificationPhoneNumber) {
      logger.warn('Notifications enabled but no phone number configured', { projectName });
      return false;
    }

    // Check rate limit
    if (isRateLimited()) {
      const secondsRemaining = Math.ceil(
        (RATE_LIMIT_MS - (Date.now() - (lastNotificationTime ?? 0))) / 1000
      );
      logger.info('Notification rate limited', {
        projectName,
        secondsRemaining,
      });
      return false;
    }

    // Build and send the notification
    const message = buildMessage(projectName, settings.serverHostname);
    const script = buildAppleScript(settings.notificationPhoneNumber, message);

    logger.info('Sending task completion notification', {
      projectName,
      phoneNumber: settings.notificationPhoneNumber.slice(0, 4) + '****', // Partial for privacy
    });

    await executeAppleScript(script);

    // Update rate limit timestamp
    lastNotificationTime = Date.now();

    logger.info('Notification sent successfully', { projectName });
    return true;
  } catch (err) {
    // Log error but don't crash - notifications are non-critical
    logger.error('Failed to send notification', {
      projectName,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send a test notification
 *
 * Bypasses rate limiting to allow testing the notification setup.
 *
 * @param phoneNumber - Phone number to send test to
 * @param serverHostname - Optional hostname for the app URL
 * @returns true if test notification was sent successfully
 */
export async function sendTestNotification(
  phoneNumber: string,
  serverHostname?: string
): Promise<boolean> {
  try {
    const message = `🤖 GoGoGadgetClaude: Test notification!\nYour notifications are set up correctly.\n${getAppUrl(serverHostname)}`;
    const script = buildAppleScript(phoneNumber, message);

    logger.info('Sending test notification', {
      phoneNumber: phoneNumber.slice(0, 4) + '****',
    });

    await executeAppleScript(script);

    logger.info('Test notification sent successfully');
    return true;
  } catch (err) {
    logger.error('Failed to send test notification', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get the current rate limit status
 *
 * Useful for debugging and UI feedback.
 *
 * @returns Object with rate limit info
 */
export function getRateLimitStatus(): {
  isLimited: boolean;
  lastNotificationTime: number | null;
  secondsUntilReset: number | null;
} {
  const isLimited = isRateLimited();
  const secondsUntilReset =
    isLimited && lastNotificationTime
      ? Math.ceil((RATE_LIMIT_MS - (Date.now() - lastNotificationTime)) / 1000)
      : null;

  return {
    isLimited,
    lastNotificationTime,
    secondsUntilReset,
  };
}

/**
 * Reset rate limiting (for testing)
 */
export function resetRateLimit(): void {
  lastNotificationTime = null;
  logger.debug('Rate limit reset');
}
