/**
 * Tests for BaseChannel Abstract Class
 *
 * Tests rate limiting logic that is shared by all notification channels.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseChannel } from './BaseChannel.js';
import type {
  NotificationPayload,
  NotificationResult,
  ChannelSettings,
  NotificationChannelId,
} from '../types.js';

/**
 * Concrete test implementation of BaseChannel for testing purposes.
 * Uses 'imessage' as the id since it's a valid NotificationChannelId.
 */
class TestChannel extends BaseChannel {
  readonly id: NotificationChannelId = 'imessage';
  readonly displayName = 'Test Channel';
  readonly description = 'A test channel for unit testing';

  public sendCount = 0;

  isAvailable(): boolean {
    return true;
  }

  isConfigured(settings: ChannelSettings): boolean {
    return settings.enabled === true;
  }

  async send(
    _payload: NotificationPayload,
    settings: ChannelSettings
  ): Promise<NotificationResult> {
    if (!settings.enabled) {
      return this.createDisabledResult();
    }

    if (this.isRateLimited()) {
      return this.createRateLimitedResult();
    }

    this.sendCount++;
    this.recordNotification();
    return this.createSuccessResult();
  }

  async sendTest(_settings: ChannelSettings, _appUrl: string): Promise<NotificationResult> {
    // Test notifications bypass rate limiting
    this.sendCount++;
    return this.createSuccessResult();
  }

  // Expose protected methods for testing
  public testIsRateLimited(): boolean {
    return this.isRateLimited();
  }

  public testRecordNotification(): void {
    this.recordNotification();
  }

  public testGetSecondsUntilReset(): number | null {
    return this.getSecondsUntilReset();
  }
}

describe('BaseChannel', () => {
  let channel: TestChannel;

  beforeEach(() => {
    vi.useFakeTimers();
    channel = new TestChannel();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rate limiting', () => {
    it('should not be rate limited initially', () => {
      expect(channel.testIsRateLimited()).toBe(false);
    });

    it('should be rate limited after recordNotification', () => {
      channel.testRecordNotification();
      expect(channel.testIsRateLimited()).toBe(true);
    });

    it('should reset rate limit after 60 seconds', () => {
      channel.testRecordNotification();
      expect(channel.testIsRateLimited()).toBe(true);

      // Advance time by 60 seconds
      vi.advanceTimersByTime(60 * 1000);

      expect(channel.testIsRateLimited()).toBe(false);
    });

    it('should still be rate limited before 60 seconds', () => {
      channel.testRecordNotification();
      expect(channel.testIsRateLimited()).toBe(true);

      // Advance time by 59 seconds
      vi.advanceTimersByTime(59 * 1000);

      expect(channel.testIsRateLimited()).toBe(true);
    });

    it('should return correct seconds until reset', () => {
      channel.testRecordNotification();

      // Initially should be close to 60 seconds
      const secondsRemaining = channel.testGetSecondsUntilReset();
      expect(secondsRemaining).toBe(60);

      // After 30 seconds, should be ~30 seconds remaining
      vi.advanceTimersByTime(30 * 1000);
      expect(channel.testGetSecondsUntilReset()).toBe(30);

      // After 60 seconds, should be null (not rate limited)
      vi.advanceTimersByTime(30 * 1000);
      expect(channel.testGetSecondsUntilReset()).toBeNull();
    });

    it('should return null for getSecondsUntilReset when not rate limited', () => {
      expect(channel.testGetSecondsUntilReset()).toBeNull();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status when not rate limited', () => {
      const status = channel.getRateLimitStatus();

      expect(status.isLimited).toBe(false);
      expect(status.lastNotificationTime).toBeNull();
      expect(status.secondsUntilReset).toBeNull();
    });

    it('should return correct status when rate limited', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      channel.testRecordNotification();
      const status = channel.getRateLimitStatus();

      expect(status.isLimited).toBe(true);
      expect(status.lastNotificationTime).toBe(now);
      expect(status.secondsUntilReset).toBe(60);
    });
  });

  describe('resetRateLimit', () => {
    it('should clear rate limit state', () => {
      channel.testRecordNotification();
      expect(channel.testIsRateLimited()).toBe(true);

      channel.resetRateLimit();

      expect(channel.testIsRateLimited()).toBe(false);
      expect(channel.getRateLimitStatus().lastNotificationTime).toBeNull();
    });
  });

  describe('send behavior', () => {
    const testPayload: NotificationPayload = {
      type: 'task-complete',
      projectName: 'TestProject',
      appUrl: 'http://localhost:3456',
    };

    it('should return disabled result when channel is disabled', async () => {
      const result = await channel.send(testPayload, { enabled: false });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Channel disabled');
      expect(channel.sendCount).toBe(0);
    });

    it('should send successfully when enabled and not rate limited', async () => {
      const result = await channel.send(testPayload, { enabled: true });

      expect(result.success).toBe(true);
      expect(channel.sendCount).toBe(1);
    });

    it('should return rate limited result when rate limited', async () => {
      // First send should succeed
      await channel.send(testPayload, { enabled: true });
      expect(channel.sendCount).toBe(1);

      // Second send should be rate limited
      const result = await channel.send(testPayload, { enabled: true });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Rate limited');
      expect(channel.sendCount).toBe(1); // Still 1, didn't send again
    });

    it('should allow send after rate limit expires', async () => {
      await channel.send(testPayload, { enabled: true });
      expect(channel.sendCount).toBe(1);

      // Wait for rate limit to expire
      vi.advanceTimersByTime(60 * 1000);

      const result = await channel.send(testPayload, { enabled: true });
      expect(result.success).toBe(true);
      expect(channel.sendCount).toBe(2);
    });
  });

  describe('sendTest behavior', () => {
    it('should bypass rate limiting', async () => {
      // Record a notification to trigger rate limiting
      channel.testRecordNotification();
      expect(channel.testIsRateLimited()).toBe(true);

      // Test notification should still work
      const result = await channel.sendTest({ enabled: true }, 'http://localhost:3456');

      expect(result.success).toBe(true);
      expect(channel.sendCount).toBe(1);
    });
  });

  describe('multiple channels have independent rate limits', () => {
    it('should track rate limits independently per channel instance', () => {
      const channel1 = new TestChannel();
      const channel2 = new TestChannel();

      // Rate limit channel1
      channel1.testRecordNotification();

      // channel1 should be rate limited, channel2 should not
      expect(channel1.testIsRateLimited()).toBe(true);
      expect(channel2.testIsRateLimited()).toBe(false);
    });
  });
});
