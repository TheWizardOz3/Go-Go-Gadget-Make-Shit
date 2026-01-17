/**
 * Base Channel
 *
 * Abstract base class for notification channels.
 * Provides common functionality like rate limiting that all channels share.
 * Concrete channels extend this class and implement the abstract methods.
 */

import type {
  NotificationChannel,
  NotificationChannelId,
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  RateLimitStatus,
} from '../types.js';
import { DEFAULT_RATE_LIMIT_MS } from '../types.js';

/**
 * Abstract base class for notification channels.
 *
 * Provides:
 * - Rate limiting implementation (configurable per channel)
 * - Common helper methods
 *
 * Subclasses must implement:
 * - id, displayName, description (readonly properties)
 * - isAvailable() - platform availability check
 * - isConfigured() - configuration validation
 * - send() - send notification (should call rate limit helpers)
 * - sendTest() - send test notification (bypasses rate limiting)
 */
export abstract class BaseChannel implements NotificationChannel {
  // ============================================================
  // Abstract Properties (must be implemented by subclasses)
  // ============================================================

  abstract readonly id: NotificationChannelId;
  abstract readonly displayName: string;
  abstract readonly description: string;

  // ============================================================
  // Rate Limiting State
  // ============================================================

  /** Timestamp of the last notification sent (ms since epoch) */
  private lastNotificationTime: number | null = null;

  /** Rate limit window in milliseconds (default: 60 seconds) */
  protected readonly rateLimitMs: number;

  // ============================================================
  // Constructor
  // ============================================================

  /**
   * Create a new BaseChannel
   * @param rateLimitMs - Optional custom rate limit window in milliseconds
   */
  constructor(rateLimitMs: number = DEFAULT_RATE_LIMIT_MS) {
    this.rateLimitMs = rateLimitMs;
  }

  // ============================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================

  /**
   * Check if this channel is available on the current platform.
   * For example, iMessage is only available on macOS.
   */
  abstract isAvailable(): boolean | Promise<boolean>;

  /**
   * Check if the channel is properly configured.
   * Returns true if all required settings are present.
   */
  abstract isConfigured(settings: ChannelSettings): boolean;

  /**
   * Send a notification.
   * Implementations should call isRateLimited() and recordNotification().
   */
  abstract send(
    payload: NotificationPayload,
    settings: ChannelSettings
  ): Promise<NotificationResult>;

  /**
   * Send a test notification.
   * Should bypass rate limiting to allow testing.
   */
  abstract sendTest(settings: ChannelSettings, appUrl: string): Promise<NotificationResult>;

  // ============================================================
  // Rate Limiting Implementation
  // ============================================================

  /**
   * Check if we're currently rate limited.
   * Call this before sending to decide whether to skip.
   */
  protected isRateLimited(): boolean {
    if (this.lastNotificationTime === null) {
      return false;
    }

    const timeSinceLast = Date.now() - this.lastNotificationTime;
    return timeSinceLast < this.rateLimitMs;
  }

  /**
   * Record that a notification was sent.
   * Call this after successfully sending a notification.
   */
  protected recordNotification(): void {
    this.lastNotificationTime = Date.now();
  }

  /**
   * Get the number of seconds until the rate limit resets.
   * Returns null if not currently rate limited.
   */
  protected getSecondsUntilReset(): number | null {
    if (!this.isRateLimited() || this.lastNotificationTime === null) {
      return null;
    }

    const timeSinceLast = Date.now() - this.lastNotificationTime;
    const remainingMs = this.rateLimitMs - timeSinceLast;
    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Get the current rate limit status.
   * Implements NotificationChannel interface.
   */
  getRateLimitStatus(): RateLimitStatus {
    const isLimited = this.isRateLimited();
    const secondsUntilReset = this.getSecondsUntilReset();

    return {
      isLimited,
      lastNotificationTime: this.lastNotificationTime,
      secondsUntilReset,
    };
  }

  /**
   * Reset rate limiting (for testing).
   * Implements NotificationChannel interface.
   */
  resetRateLimit(): void {
    this.lastNotificationTime = null;
  }

  // ============================================================
  // Helper Methods for Subclasses
  // ============================================================

  /**
   * Create a "skipped" result for rate limiting.
   * Convenience method for subclasses.
   */
  protected createRateLimitedResult(): NotificationResult {
    const seconds = this.getSecondsUntilReset();
    return {
      success: false,
      skipped: true,
      skipReason: `Rate limited (${seconds}s remaining)`,
    };
  }

  /**
   * Create a "skipped" result for disabled channel.
   * Convenience method for subclasses.
   */
  protected createDisabledResult(): NotificationResult {
    return {
      success: false,
      skipped: true,
      skipReason: 'Channel disabled',
    };
  }

  /**
   * Create an error result.
   * Convenience method for subclasses.
   */
  protected createErrorResult(error: unknown): NotificationResult {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Create a success result.
   * Convenience method for subclasses.
   */
  protected createSuccessResult(): NotificationResult {
    return {
      success: true,
    };
  }
}
