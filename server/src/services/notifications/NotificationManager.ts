/**
 * Notification Manager
 *
 * Singleton that orchestrates all notification channels.
 * Handles channel registration, broadcasts to all enabled channels,
 * and provides backward-compatible exports.
 */

import { logger } from '../../lib/logger.js';
import { config } from '../../lib/config.js';
import { getSettings, type AppSettings } from '../settingsService.js';
import type {
  NotificationChannel,
  NotificationChannelId,
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  ChannelInfo,
} from './types.js';
import { IMessageChannel } from './channels/IMessageChannel.js';
import { NtfyChannel } from './channels/NtfyChannel.js';

// ============================================================
// Types
// ============================================================

/** Map of channel IDs to their results */
export type NotificationResults = Map<NotificationChannelId, NotificationResult>;

// ============================================================
// Notification Manager
// ============================================================

/**
 * Singleton class that manages all notification channels.
 *
 * Responsibilities:
 * - Register and manage notification channels
 * - Broadcast notifications to all enabled channels
 * - Handle errors gracefully (one failure doesn't block others)
 * - Provide channel info for settings UI
 */
export class NotificationManager {
  // ============================================================
  // Singleton
  // ============================================================

  private static instance: NotificationManager | null = null;

  /**
   * Get the singleton instance.
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  static resetInstance(): void {
    NotificationManager.instance = null;
  }

  // ============================================================
  // State
  // ============================================================

  /** Registered notification channels */
  private channels: Map<NotificationChannelId, NotificationChannel> = new Map();

  // ============================================================
  // Constructor
  // ============================================================

  private constructor() {
    // Register all available channels
    this.registerChannel(new IMessageChannel());
    this.registerChannel(new NtfyChannel());

    // Future channels will be registered here:
    // this.registerChannel(new SlackChannel());
    // this.registerChannel(new TelegramChannel());
    // this.registerChannel(new EmailChannel());

    logger.debug('NotificationManager initialized', {
      channels: Array.from(this.channels.keys()),
    });
  }

  // ============================================================
  // Channel Registration
  // ============================================================

  /**
   * Register a notification channel.
   */
  private registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.debug(`Registered notification channel: ${channel.id}`);
  }

  // ============================================================
  // Channel Access
  // ============================================================

  /**
   * Get all registered channels.
   */
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get a specific channel by ID.
   */
  getChannel(id: NotificationChannelId): NotificationChannel | undefined {
    return this.channels.get(id);
  }

  /**
   * Get channels available on the current platform.
   */
  async getAvailableChannels(): Promise<NotificationChannel[]> {
    const available: NotificationChannel[] = [];

    for (const channel of this.channels.values()) {
      try {
        if (await channel.isAvailable()) {
          available.push(channel);
        }
      } catch (err) {
        logger.warn(`Error checking availability for channel ${channel.id}`, {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return available;
  }

  /**
   * Get channel information for the settings UI.
   * Includes availability and configuration status.
   */
  async getChannelInfo(settings: AppSettings): Promise<ChannelInfo[]> {
    const info: ChannelInfo[] = [];

    for (const channel of this.channels.values()) {
      const channelSettings = settings.channels?.[channel.id] ?? {};
      const isAvailable = await channel.isAvailable();
      const isConfigured = channel.isConfigured(channelSettings);

      info.push({
        id: channel.id,
        displayName: channel.displayName,
        description: channel.description,
        isAvailable,
        isConfigured,
      });
    }

    return info;
  }

  // ============================================================
  // Send Notifications
  // ============================================================

  /**
   * Send a task completion notification to all enabled channels.
   *
   * Errors in one channel don't block other channels.
   * Returns a map of results for each channel.
   */
  async sendTaskComplete(projectName: string): Promise<NotificationResults> {
    const results: NotificationResults = new Map();
    const settings = await getSettings();

    // Check if any channels are configured
    if (!settings.channels) {
      logger.debug('No notification channels configured');
      return results;
    }

    const appUrl = this.getAppUrl(settings.serverHostname);
    const payload: NotificationPayload = {
      type: 'task-complete',
      projectName,
      appUrl,
    };

    // Send to all channels in parallel
    const sendPromises = Array.from(this.channels.entries()).map(async ([channelId, channel]) => {
      const channelSettings = settings.channels?.[channelId] as ChannelSettings | undefined;

      // Skip if no settings for this channel
      if (!channelSettings) {
        return {
          channelId,
          result: {
            success: false,
            skipped: true,
            skipReason: 'Not configured',
          } as NotificationResult,
        };
      }

      // Check platform availability
      try {
        const isAvailable = await channel.isAvailable();
        if (!isAvailable) {
          return {
            channelId,
            result: {
              success: false,
              skipped: true,
              skipReason: 'Not available on this platform',
            } as NotificationResult,
          };
        }
      } catch (err) {
        return {
          channelId,
          result: {
            success: false,
            error: `Availability check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          } as NotificationResult,
        };
      }

      // Send notification
      try {
        const result = await channel.send(payload, channelSettings);

        // Log result
        if (result.success) {
          logger.info(`Notification sent via ${channelId}`, { projectName });
        } else if (result.skipped) {
          logger.debug(`Notification skipped for ${channelId}`, {
            reason: result.skipReason,
          });
        } else {
          logger.warn(`Notification failed for ${channelId}`, {
            error: result.error,
          });
        }

        return { channelId, result };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Notification error for ${channelId}`, { error });

        return {
          channelId,
          result: { success: false, error } as NotificationResult,
        };
      }
    });

    // Wait for all channels and collect results
    const channelResults = await Promise.all(sendPromises);
    for (const { channelId, result } of channelResults) {
      results.set(channelId, result);
    }

    return results;
  }

  /**
   * Send a test notification to a specific channel.
   *
   * Uses the provided settings directly (not from settings file).
   * Bypasses rate limiting.
   */
  async sendTest(
    channelId: NotificationChannelId,
    channelSettings: ChannelSettings
  ): Promise<NotificationResult> {
    const channel = this.channels.get(channelId);

    if (!channel) {
      return {
        success: false,
        error: `Unknown channel: ${channelId}`,
      };
    }

    // Check platform availability
    try {
      const isAvailable = await channel.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Channel not available on this platform',
        };
      }
    } catch (err) {
      return {
        success: false,
        error: `Availability check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }

    // Get app URL from settings
    const settings = await getSettings();
    const appUrl = this.getAppUrl(settings.serverHostname);

    // Send test notification
    try {
      return await channel.sendTest(channelSettings, appUrl);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Build the app URL for notification messages.
   *
   * Uses the configured Tailscale hostname and port.
   */
  private getAppUrl(serverHostname?: string): string {
    const hostnameOrUrl = serverHostname || config.tailscaleHostname;
    const port = config.port;

    // If the hostname already includes a protocol, use it as-is
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
}

// ============================================================
// Singleton Export
// ============================================================

/**
 * Pre-instantiated notification manager.
 * Use this for convenience instead of NotificationManager.getInstance().
 */
export const notificationManager = NotificationManager.getInstance();

// ============================================================
// Backward-Compatible Exports
// ============================================================

/**
 * Send a task completion notification.
 *
 * Backward-compatible function that wraps the NotificationManager.
 * Returns true if at least one channel succeeded.
 *
 * @param projectName - Name of the project that completed
 * @returns true if at least one notification was sent
 */
export async function sendTaskCompleteNotification(projectName: string): Promise<boolean> {
  const results = await notificationManager.sendTaskComplete(projectName);

  // Return true if any channel succeeded
  for (const result of results.values()) {
    if (result.success) {
      return true;
    }
  }

  return false;
}
