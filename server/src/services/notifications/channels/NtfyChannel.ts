/**
 * ntfy Channel
 *
 * Sends push notifications via ntfy.sh or self-hosted ntfy servers.
 * Available on all platforms (pure HTTP-based).
 *
 * @see https://docs.ntfy.sh/publish/
 */

import { BaseChannel } from './BaseChannel.js';
import type {
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  NtfyChannelSettings,
} from '../types.js';
import { logger } from '../../../lib/logger.js';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Helper to safely access ntfy settings.
 * Returns the settings if valid, or null otherwise.
 */
function asNtfySettings(settings: ChannelSettings): NtfyChannelSettings | null {
  if (
    typeof settings === 'object' &&
    settings !== null &&
    'enabled' in settings &&
    typeof settings.enabled === 'boolean'
  ) {
    return settings as unknown as NtfyChannelSettings;
  }
  return null;
}

// ============================================================
// NtfyChannel Class
// ============================================================

/**
 * ntfy notification channel.
 *
 * Sends push notifications via ntfy.sh or self-hosted ntfy servers.
 * Unlike iMessage, ntfy is available on all platforms since it's
 * pure HTTP-based. Users subscribe to a topic in the ntfy app
 * (iOS, Android, web, desktop) and receive push notifications.
 *
 * Configuration:
 * - serverUrl: The ntfy server URL (default: https://ntfy.sh)
 * - topic: The topic name to publish to
 * - authToken: Optional auth token for private servers/topics
 *
 * @see https://docs.ntfy.sh/
 */
export class NtfyChannel extends BaseChannel {
  // ============================================================
  // Channel Identity
  // ============================================================

  readonly id = 'ntfy' as const;
  readonly displayName = 'ntfy';
  readonly description = 'Push notifications via ntfy.sh';

  // ============================================================
  // Platform Availability
  // ============================================================

  /**
   * Check if ntfy is available.
   * ntfy is available on all platforms (HTTP-based).
   */
  isAvailable(): boolean {
    return true;
  }

  // ============================================================
  // Configuration Validation
  // ============================================================

  /**
   * Check if the channel is properly configured.
   * Requires enabled=true, serverUrl, and topic.
   */
  isConfigured(settings: ChannelSettings): boolean {
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) {
      return false;
    }
    return (
      ntfySettings.enabled === true &&
      typeof ntfySettings.serverUrl === 'string' &&
      ntfySettings.serverUrl.length > 0 &&
      typeof ntfySettings.topic === 'string' &&
      ntfySettings.topic.length > 0
    );
  }

  // ============================================================
  // Send Notifications
  // ============================================================

  /**
   * Send a notification via ntfy.
   *
   * Checks if enabled, configured, and not rate limited before sending.
   */
  async send(payload: NotificationPayload, settings: ChannelSettings): Promise<NotificationResult> {
    // Validate settings
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) {
      return {
        success: false,
        error: 'Invalid ntfy settings',
      };
    }

    // Check if channel is enabled
    if (!ntfySettings.enabled) {
      return this.createDisabledResult();
    }

    // Check if properly configured
    if (!ntfySettings.serverUrl || !ntfySettings.topic) {
      return {
        success: false,
        error: 'Server URL and topic are required',
      };
    }

    // Check rate limit
    if (this.isRateLimited()) {
      return this.createRateLimitedResult();
    }

    // Format and send the message
    const message = this.formatMessage(payload);

    try {
      logger.info('Sending ntfy notification', {
        type: payload.type,
        projectName: payload.projectName,
        serverUrl: ntfySettings.serverUrl,
        topic: ntfySettings.topic,
      });

      await this.publishToNtfy(ntfySettings, message);

      // Record successful send for rate limiting
      this.recordNotification();

      logger.info('ntfy notification sent successfully', {
        type: payload.type,
        projectName: payload.projectName,
      });

      return this.createSuccessResult();
    } catch (err) {
      logger.error('Failed to send ntfy notification', {
        type: payload.type,
        projectName: payload.projectName,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      return this.createErrorResult(err);
    }
  }

  /**
   * Send a test notification via ntfy.
   *
   * Bypasses rate limiting to allow testing the configuration.
   */
  async sendTest(settings: ChannelSettings, appUrl: string): Promise<NotificationResult> {
    // Validate settings
    const ntfySettings = asNtfySettings(settings);
    if (!ntfySettings) {
      return {
        success: false,
        error: 'Invalid ntfy settings',
      };
    }

    // Check if properly configured
    if (!ntfySettings.serverUrl || !ntfySettings.topic) {
      return {
        success: false,
        error: 'Server URL and topic are required',
      };
    }

    const message = this.formatTestMessage(appUrl);

    try {
      logger.info('Sending ntfy test notification', {
        serverUrl: ntfySettings.serverUrl,
        topic: ntfySettings.topic,
      });

      await this.publishToNtfy(ntfySettings, message);

      logger.info('ntfy test notification sent successfully');

      return this.createSuccessResult();
    } catch (err) {
      logger.error('Failed to send ntfy test notification', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      return this.createErrorResult(err);
    }
  }

  // ============================================================
  // Message Formatting
  // ============================================================

  /**
   * Format a notification message based on payload type.
   */
  private formatMessage(payload: NotificationPayload): string {
    switch (payload.type) {
      case 'task-complete':
        return `🤖 GoGoGadgetClaude: Task complete in ${payload.projectName}.\n${payload.appUrl}`;

      case 'test':
        return payload.message ?? `🤖 GoGoGadgetClaude notification\n${payload.appUrl}`;

      default:
        return `🤖 GoGoGadgetClaude notification\n${payload.appUrl}`;
    }
  }

  /**
   * Format a test notification message.
   */
  private formatTestMessage(appUrl: string): string {
    return `🤖 GoGoGadgetClaude: Test notification!\nYour ntfy setup is working correctly.\n${appUrl}`;
  }

  // ============================================================
  // ntfy API Integration
  // ============================================================

  /**
   * Publish a message to the ntfy server.
   *
   * Uses the ntfy HTTP API:
   * - POST to {serverUrl}/{topic}
   * - Body is the message text (plain text)
   * - Optional Authorization header for private topics
   *
   * @see https://docs.ntfy.sh/publish/
   */
  private async publishToNtfy(settings: NtfyChannelSettings, message: string): Promise<void> {
    const url = this.buildPublishUrl(settings.serverUrl!, settings.topic!);

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };

    // Add auth header if token provided (for private servers/topics)
    if (settings.authToken) {
      headers['Authorization'] = `Bearer ${settings.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ntfy API error (${response.status}): ${errorText}`);
    }
  }

  /**
   * Build the publish URL from server URL and topic.
   *
   * Handles edge cases:
   * - Server URL with trailing slash
   * - Topic with leading slash
   */
  private buildPublishUrl(serverUrl: string, topic: string): string {
    // Ensure server URL doesn't have trailing slash
    const baseUrl = serverUrl.replace(/\/+$/, '');
    // Ensure topic doesn't have leading slash
    const cleanTopic = topic.replace(/^\/+/, '');
    return `${baseUrl}/${cleanTopic}`;
  }
}
