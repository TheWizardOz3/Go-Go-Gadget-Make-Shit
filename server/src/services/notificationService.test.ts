/**
 * Tests for Notification Service
 *
 * Tests the NotificationManager and IMessageChannel through the legacy facade.
 * Tests rate limiting logic and notification triggering.
 * AppleScript execution is mocked since it requires macOS.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendTaskCompleteNotification,
  sendTestNotification,
  getRateLimitStatus,
  resetRateLimit,
} from './notificationService.js';
import { NotificationManager } from './notifications/NotificationManager.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock settingsService
vi.mock('./settingsService.js', () => ({
  getSettings: vi.fn(),
}));

// Mock config
vi.mock('../lib/config.js', () => ({
  config: {
    port: 3456,
    tailscaleHostname: 'test-host.tailnet.ts.net',
    httpsEnabled: false,
  },
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { execa } from 'execa';
import { getSettings } from './settingsService.js';

const mockExeca = vi.mocked(execa);
const mockGetSettings = vi.mocked(getSettings);

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit(); // Reset rate limit before each test
    // Reset the NotificationManager singleton to get fresh channels
    NotificationManager.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendTaskCompleteNotification', () => {
    it('should return false when channel is disabled', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: false,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });

      const result = await sendTaskCompleteNotification('TestProject');

      expect(result).toBe(false);
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should return false when no phone number is configured', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: undefined,
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });

      const result = await sendTaskCompleteNotification('TestProject');

      expect(result).toBe(false);
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should send notification when enabled and phone configured', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockResolvedValueOnce({} as never);

      const result = await sendTaskCompleteNotification('TestProject');

      expect(result).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith(
        'osascript',
        ['-e', expect.stringContaining('TestProject')],
        expect.any(Object)
      );
    });

    it('should include app URL in notification message', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockResolvedValueOnce({} as never);

      await sendTaskCompleteNotification('MyApp');

      expect(mockExeca).toHaveBeenCalledWith(
        'osascript',
        ['-e', expect.stringContaining('http://test-host.tailnet.ts.net:3456')],
        expect.any(Object)
      );
    });

    it('should return false when rate limited', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockResolvedValue({} as never);

      // First notification should succeed
      const first = await sendTaskCompleteNotification('Project1');
      expect(first).toBe(true);

      // Second notification immediately after should be rate limited
      const second = await sendTaskCompleteNotification('Project2');
      expect(second).toBe(false);

      // Only one execa call (first notification)
      expect(mockExeca).toHaveBeenCalledTimes(1);
    });

    it('should return false when AppleScript fails', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockRejectedValueOnce(new Error('osascript failed'));

      const result = await sendTaskCompleteNotification('TestProject');

      expect(result).toBe(false);
    });

    it('should return false when no channels configured', async () => {
      mockGetSettings.mockResolvedValueOnce({
        defaultTemplates: [],
        theme: 'system',
        // No channels configured
      });

      const result = await sendTaskCompleteNotification('TestProject');

      expect(result).toBe(false);
      expect(mockExeca).not.toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification with phone number', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      const result = await sendTestNotification('+1234567890');

      expect(result).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith(
        'osascript',
        ['-e', expect.stringContaining('Test notification')],
        expect.any(Object)
      );
    });

    it('should return false when AppleScript fails', async () => {
      mockExeca.mockRejectedValueOnce(new Error('osascript failed'));

      const result = await sendTestNotification('+1234567890');

      expect(result).toBe(false);
    });

    it('should bypass rate limiting', async () => {
      mockExeca.mockResolvedValue({} as never);

      // Send multiple test notifications rapidly
      const first = await sendTestNotification('+1234567890');
      const second = await sendTestNotification('+1234567890');
      const third = await sendTestNotification('+1234567890');

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(third).toBe(true);
      expect(mockExeca).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return not limited initially', () => {
      const status = getRateLimitStatus();

      expect(status.isLimited).toBe(false);
      expect(status.lastNotificationTime).toBeNull();
      expect(status.secondsUntilReset).toBeNull();
    });

    it('should return limited after notification sent', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockResolvedValueOnce({} as never);

      await sendTaskCompleteNotification('TestProject');

      const status = getRateLimitStatus();

      expect(status.isLimited).toBe(true);
      expect(status.lastNotificationTime).not.toBeNull();
      expect(status.secondsUntilReset).toBeGreaterThan(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should clear rate limit state', async () => {
      mockGetSettings.mockResolvedValueOnce({
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'system',
      });
      mockExeca.mockResolvedValueOnce({} as never);

      await sendTaskCompleteNotification('TestProject');
      expect(getRateLimitStatus().isLimited).toBe(true);

      resetRateLimit();

      expect(getRateLimitStatus().isLimited).toBe(false);
    });
  });
});
