/**
 * Tests for NotificationManager
 *
 * Tests the orchestration of multiple notification channels, including
 * sending to all channels, channel filtering, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager, notificationManager } from './NotificationManager.js';
import type { AppSettings } from '../../../../shared/types/index.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock settingsService
vi.mock('../settingsService.js', () => ({
  getSettings: vi.fn(),
}));

// Mock config
vi.mock('../../lib/config.js', () => ({
  config: {
    port: 3456,
    tailscaleHostname: 'test-host.tailnet.ts.net',
    httpsEnabled: false,
  },
}));

// Mock logger
vi.mock('../../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { execa } from 'execa';
import { getSettings } from '../settingsService.js';

const mockExeca = vi.mocked(execa);
const mockGetSettings = vi.mocked(getSettings);

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton to get a fresh instance with fresh channels
    NotificationManager.resetInstance();
    manager = NotificationManager.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationManager.getInstance();
      const instance2 = NotificationManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return a new instance after reset', () => {
      const instance1 = NotificationManager.getInstance();
      NotificationManager.resetInstance();
      const instance2 = NotificationManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });

    it('should export a notificationManager singleton', () => {
      expect(notificationManager).toBeDefined();
      expect(notificationManager).toBeInstanceOf(NotificationManager);
    });
  });

  describe('getChannels', () => {
    it('should return registered channels', () => {
      const channels = manager.getChannels();
      expect(channels.length).toBeGreaterThan(0);
    });

    it('should include iMessage channel', () => {
      const channels = manager.getChannels();
      const imessage = channels.find((c) => c.id === 'imessage');
      expect(imessage).toBeDefined();
      expect(imessage?.displayName).toBe('iMessage');
    });
  });

  describe('getChannel', () => {
    it('should return channel by id', () => {
      const channel = manager.getChannel('imessage');
      expect(channel).toBeDefined();
      expect(channel?.id).toBe('imessage');
    });

    it('should return undefined for unknown channel', () => {
      const channel = manager.getChannel('nonexistent' as 'imessage');
      expect(channel).toBeUndefined();
    });
  });

  describe('getAvailableChannels', () => {
    it('should return channels available on current platform', async () => {
      const available = await manager.getAvailableChannels();
      // On macOS, iMessage should be available
      // On other platforms, it might not be
      expect(Array.isArray(available)).toBe(true);
    });
  });

  describe('getChannelInfo', () => {
    it('should return info for all channels', async () => {
      const settings = {
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings;

      const info = await manager.getChannelInfo(settings);

      expect(info.length).toBeGreaterThan(0);
      const imessageInfo = info.find((i) => i.id === 'imessage');
      expect(imessageInfo).toBeDefined();
      expect(imessageInfo?.displayName).toBe('iMessage');
      expect(imessageInfo?.isConfigured).toBe(true);
    });

    it('should mark unconfigured channels correctly', async () => {
      const settings = {
        channels: {
          imessage: { enabled: false },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings;

      const info = await manager.getChannelInfo(settings);
      const imessageInfo = info.find((i) => i.id === 'imessage');

      expect(imessageInfo?.isConfigured).toBe(false);
    });
  });

  describe('sendTaskComplete', () => {
    it('should send to all enabled channels', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockResolvedValue({} as never);

      const results = await manager.sendTaskComplete('TestProject');

      expect(results.size).toBeGreaterThan(0);
      const imessageResult = results.get('imessage');
      // Result depends on whether iMessage is available on this platform
      expect(imessageResult).toBeDefined();
    });

    it('should skip disabled channels', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: false, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);

      const results = await manager.sendTaskComplete('TestProject');

      const imessageResult = results.get('imessage');
      expect(imessageResult?.success).toBe(false);
      expect(imessageResult?.skipped).toBe(true);
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should skip channels without settings', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {}, // Empty channels object
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);

      const results = await manager.sendTaskComplete('TestProject');

      // Should have result for imessage (not configured)
      const imessageResult = results.get('imessage');
      expect(imessageResult).toBeDefined();
      expect(imessageResult?.success).toBe(false);
      expect(imessageResult?.skipped).toBe(true);
      expect(imessageResult?.skipReason).toBe('Not configured');
    });

    it('should continue after one channel fails', async () => {
      // Mock settings with one channel that will fail
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockRejectedValue(new Error('AppleScript error'));

      const results = await manager.sendTaskComplete('TestProject');

      // Should have processed imessage even though it failed
      expect(results.has('imessage')).toBe(true);
    });

    it('should return results map for all channels', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockResolvedValue({} as never);

      const results = await manager.sendTaskComplete('TestProject');

      expect(results).toBeInstanceOf(Map);
      // Should have entry for each registered channel
      for (const channel of manager.getChannels()) {
        expect(results.has(channel.id)).toBe(true);
      }
    });
  });

  describe('sendTest', () => {
    it('should send test to specific channel', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      // Need to mock getSettings for the app URL
      mockGetSettings.mockResolvedValueOnce({
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);

      const result = await manager.sendTest('imessage', {
        enabled: true,
        phoneNumber: '+1234567890',
      });

      // Result depends on platform availability
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should return error for unknown channel', async () => {
      mockGetSettings.mockResolvedValueOnce({
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);

      const result = await manager.sendTest('nonexistent' as 'imessage', {
        enabled: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown channel');
    });

    it('should return error when channel not available', async () => {
      // Mock a channel that reports not available
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      mockGetSettings.mockResolvedValueOnce({
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);

      const result = await manager.sendTest('imessage', {
        enabled: true,
        phoneNumber: '+1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('app URL generation', () => {
    it('should use serverHostname from settings when provided', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        serverHostname: 'custom-host.example.com',
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockResolvedValue({} as never);

      await manager.sendTaskComplete('TestProject');

      // Only check if execa was called (on macOS)
      if (mockExeca.mock.calls.length > 0) {
        const calls = mockExeca.mock.calls as unknown[][];
        const scriptArg = calls[0]?.[1] as string[] | undefined;
        expect(scriptArg?.[1]).toContain('custom-host.example.com');
      }
    });

    it('should fall back to config hostname when not in settings', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        // No serverHostname
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockResolvedValue({} as never);

      await manager.sendTaskComplete('TestProject');

      // Only check if execa was called (on macOS)
      if (mockExeca.mock.calls.length > 0) {
        const calls = mockExeca.mock.calls as unknown[][];
        const scriptArg = calls[0]?.[1] as string[] | undefined;
        expect(scriptArg?.[1]).toContain('test-host.tailnet.ts.net');
      }
    });
  });

  describe('error handling', () => {
    it('should handle settings fetch error by throwing', async () => {
      mockGetSettings.mockRejectedValue(new Error('Settings unavailable'));

      // sendTaskComplete should throw when settings can't be fetched
      await expect(manager.sendTaskComplete('TestProject')).rejects.toThrow('Settings unavailable');
    });

    it('should capture channel errors in results without throwing', async () => {
      mockGetSettings.mockResolvedValue({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
        defaultTemplates: [],
        theme: 'system',
      } as AppSettings);
      mockExeca.mockRejectedValue(new Error('osascript crashed'));

      const results = await manager.sendTaskComplete('TestProject');

      // Should have a result for imessage
      const imessageResult = results.get('imessage');
      expect(imessageResult).toBeDefined();

      // On macOS: should be error result, on other platforms: not available
      if (process.platform === 'darwin') {
        expect(imessageResult?.success).toBe(false);
        expect(imessageResult?.error).toBeDefined();
      } else {
        // On non-macOS, iMessage is not available
        expect(imessageResult?.skipped).toBe(true);
      }
    });
  });
});
