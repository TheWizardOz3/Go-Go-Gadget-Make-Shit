/**
 * iMessage Channel
 *
 * Sends notifications via macOS Messages.app using AppleScript.
 * Only available on macOS.
 */

import { execa } from 'execa';
import { BaseChannel } from './BaseChannel.js';
import type {
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  IMessageChannelSettings,
} from '../types.js';
import { logger } from '../../../lib/logger.js';

/**
 * Helper to safely access iMessage settings
 * Returns the settings if valid, or null otherwise
 */
function asIMessageSettings(settings: ChannelSettings): IMessageChannelSettings | null {
  if (
    typeof settings === 'object' &&
    settings !== null &&
    'enabled' in settings &&
    typeof settings.enabled === 'boolean'
  ) {
    return settings as unknown as IMessageChannelSettings;
  }
  return null;
}

/**
 * iMessage notification channel.
 *
 * Uses macOS AppleScript to send messages via the Messages.app.
 * The recipient must have iMessage enabled with the configured phone number.
 */
export class IMessageChannel extends BaseChannel {
  // ============================================================
  // Channel Identity
  // ============================================================

  readonly id = 'imessage' as const;
  readonly displayName = 'iMessage';
  readonly description = 'Send notifications via iMessage (macOS only)';

  // ============================================================
  // Platform Availability
  // ============================================================

  /**
   * Check if iMessage is available.
   * Only available on macOS (darwin).
   */
  isAvailable(): boolean {
    return process.platform === 'darwin';
  }

  // ============================================================
  // Configuration Validation
  // ============================================================

  /**
   * Check if the channel is properly configured.
   * Requires enabled=true and a phone number.
   */
  isConfigured(settings: ChannelSettings): boolean {
    const iMessageSettings = asIMessageSettings(settings);
    if (!iMessageSettings) {
      return false;
    }
    return (
      iMessageSettings.enabled === true &&
      typeof iMessageSettings.phoneNumber === 'string' &&
      iMessageSettings.phoneNumber.length > 0
    );
  }

  // ============================================================
  // Send Notifications
  // ============================================================

  /**
   * Send a notification via iMessage.
   *
   * Checks if enabled, configured, and not rate limited before sending.
   */
  async send(payload: NotificationPayload, settings: ChannelSettings): Promise<NotificationResult> {
    // Validate settings
    const iMessageSettings = asIMessageSettings(settings);
    if (!iMessageSettings) {
      return {
        success: false,
        error: 'Invalid iMessage settings',
      };
    }

    // Check if channel is enabled
    if (!iMessageSettings.enabled) {
      return this.createDisabledResult();
    }

    // Check if properly configured
    if (!iMessageSettings.phoneNumber) {
      return {
        success: false,
        error: 'Phone number not configured',
      };
    }

    // Check rate limit
    if (this.isRateLimited()) {
      return this.createRateLimitedResult();
    }

    // Format and send the message
    const message = this.formatMessage(payload);

    try {
      logger.info('Sending iMessage notification', {
        type: payload.type,
        projectName: payload.projectName,
        phoneNumber: this.maskPhoneNumber(iMessageSettings.phoneNumber),
      });

      await this.executeAppleScript(iMessageSettings.phoneNumber, message);

      // Record successful send for rate limiting
      this.recordNotification();

      logger.info('iMessage notification sent successfully', {
        type: payload.type,
        projectName: payload.projectName,
      });

      return this.createSuccessResult();
    } catch (err) {
      logger.error('Failed to send iMessage notification', {
        type: payload.type,
        projectName: payload.projectName,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      return this.createErrorResult(err);
    }
  }

  /**
   * Send a test notification via iMessage.
   *
   * Bypasses rate limiting to allow testing the configuration.
   */
  async sendTest(settings: ChannelSettings, appUrl: string): Promise<NotificationResult> {
    // Validate settings
    const iMessageSettings = asIMessageSettings(settings);
    if (!iMessageSettings) {
      return {
        success: false,
        error: 'Invalid iMessage settings',
      };
    }

    // Check if properly configured
    if (!iMessageSettings.phoneNumber) {
      return {
        success: false,
        error: 'Phone number not configured',
      };
    }

    const message = this.formatTestMessage(appUrl);

    try {
      logger.info('Sending iMessage test notification', {
        phoneNumber: this.maskPhoneNumber(iMessageSettings.phoneNumber),
      });

      await this.executeAppleScript(iMessageSettings.phoneNumber, message);

      logger.info('iMessage test notification sent successfully');

      return this.createSuccessResult();
    } catch (err) {
      logger.error('Failed to send iMessage test notification', {
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
    return `🤖 GoGoGadgetClaude: Test notification!\nYour notifications are set up correctly.\n${appUrl}`;
  }

  // ============================================================
  // AppleScript Execution
  // ============================================================

  /**
   * Build and execute AppleScript to send an iMessage.
   *
   * Uses Messages.app's AppleScript interface.
   * The recipient must have iMessage enabled with the given phone number.
   */
  private async executeAppleScript(phoneNumber: string, message: string): Promise<void> {
    const script = this.buildAppleScript(phoneNumber, message);

    await execa('osascript', ['-e', script], {
      timeout: 10000, // 10 second timeout
      reject: true,
    });
  }

  /**
   * Build the AppleScript command to send an iMessage.
   *
   * Escapes special characters in the message for AppleScript.
   */
  private buildAppleScript(phoneNumber: string, message: string): string {
    // Escape special characters for AppleScript
    const escapedMessage = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');

    // AppleScript to send iMessage
    return `
      tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set targetBuddy to participant "${phoneNumber}" of targetService
        send "${escapedMessage}" to targetBuddy
      end tell
    `;
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Mask a phone number for logging (privacy).
   * Shows first 4 characters and masks the rest.
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) {
      return '****';
    }
    return phoneNumber.slice(0, 4) + '****';
  }
}
