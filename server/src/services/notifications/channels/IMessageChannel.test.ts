/**
 * Tests for IMessageChannel
 *
 * Tests iMessage-specific functionality including platform availability,
 * configuration validation, and message formatting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IMessageChannel } from './IMessageChannel.js';
import type { NotificationPayload, ChannelSettings } from '../types.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { execa } from 'execa';

const mockExeca = vi.mocked(execa);

describe('IMessageChannel', () => {
  let channel: IMessageChannel;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    channel = new IMessageChannel();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('channel identity', () => {
    it('should have correct id', () => {
      expect(channel.id).toBe('imessage');
    });

    it('should have correct displayName', () => {
      expect(channel.displayName).toBe('iMessage');
    });

    it('should have a description', () => {
      expect(channel.description).toBeTruthy();
      expect(channel.description).toContain('macOS');
    });
  });

  describe('isAvailable', () => {
    it('should return true on macOS (darwin)', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(channel.isAvailable()).toBe(true);
    });

    it('should return false on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(channel.isAvailable()).toBe(false);
    });

    it('should return false on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(channel.isAvailable()).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return true when enabled with phone number', () => {
      const settings: ChannelSettings = {
        enabled: true,
        phoneNumber: '+1234567890',
      };
      expect(channel.isConfigured(settings)).toBe(true);
    });

    it('should return false when disabled', () => {
      const settings: ChannelSettings = {
        enabled: false,
        phoneNumber: '+1234567890',
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when no phone number', () => {
      const settings: ChannelSettings = {
        enabled: true,
        phoneNumber: undefined,
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when phone number is empty string', () => {
      const settings: ChannelSettings = {
        enabled: true,
        phoneNumber: '',
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false for invalid settings object', () => {
      expect(channel.isConfigured({})).toBe(false);
      expect(channel.isConfigured({ foo: 'bar' })).toBe(false);
    });
  });

  describe('send', () => {
    const testPayload: NotificationPayload = {
      type: 'task-complete',
      projectName: 'MyProject',
      appUrl: 'http://localhost:3456',
    };

    const validSettings: ChannelSettings = {
      enabled: true,
      phoneNumber: '+1234567890',
    };

    it('should return disabled result when channel is disabled', async () => {
      const result = await channel.send(testPayload, {
        enabled: false,
        phoneNumber: '+1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Channel disabled');
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should return error when no phone number configured', async () => {
      const result = await channel.send(testPayload, {
        enabled: true,
        phoneNumber: undefined,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number not configured');
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should return rate limited result when rate limited', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      // First send
      await channel.send(testPayload, validSettings);

      // Second send should be rate limited
      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Rate limited');
    });

    it('should send notification successfully', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith(
        'osascript',
        ['-e', expect.stringContaining('MyProject')],
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should include app URL in message', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      await channel.send(testPayload, validSettings);

      const calls = mockExeca.mock.calls as unknown[][];
      const scriptArg = calls[0]?.[1] as string[] | undefined;
      expect(scriptArg?.[1]).toContain('http://localhost:3456');
    });

    it('should escape special characters in message', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      const payloadWithSpecialChars: NotificationPayload = {
        type: 'task-complete',
        projectName: 'Project with "quotes" and backslash \\',
        appUrl: 'http://localhost:3456',
      };

      await channel.send(payloadWithSpecialChars, validSettings);

      // The message should be escaped for AppleScript
      const calls = mockExeca.mock.calls as unknown[][];
      const scriptArg = calls[0]?.[1] as string[] | undefined;
      expect(scriptArg?.[1]).toContain('\\"quotes\\"');
      expect(scriptArg?.[1]).toContain('\\\\');
    });

    it('should return error result when AppleScript fails', async () => {
      mockExeca.mockRejectedValueOnce(new Error('osascript failed'));

      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('osascript failed');
    });

    it('should return error for invalid settings type', async () => {
      const result = await channel.send(testPayload, { invalid: 'settings' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid iMessage settings');
    });
  });

  describe('sendTest', () => {
    it('should return error when no phone number configured', async () => {
      const result = await channel.sendTest(
        { enabled: true, phoneNumber: undefined },
        'http://localhost:3456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number not configured');
    });

    it('should send test notification successfully', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      const result = await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'http://localhost:3456'
      );

      expect(result.success).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith(
        'osascript',
        ['-e', expect.stringContaining('Test notification')],
        expect.any(Object)
      );
    });

    it('should include app URL in test message', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'https://my-app.example.com'
      );

      const calls = mockExeca.mock.calls as unknown[][];
      const scriptArg = calls[0]?.[1] as string[] | undefined;
      expect(scriptArg?.[1]).toContain('https://my-app.example.com');
    });

    it('should bypass rate limiting', async () => {
      mockExeca.mockResolvedValue({} as never);

      // Send multiple test notifications rapidly
      const result1 = await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'http://localhost:3456'
      );
      const result2 = await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'http://localhost:3456'
      );
      const result3 = await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'http://localhost:3456'
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect(mockExeca).toHaveBeenCalledTimes(3);
    });

    it('should return error result when AppleScript fails', async () => {
      mockExeca.mockRejectedValueOnce(new Error('Messages.app not running'));

      const result = await channel.sendTest(
        { enabled: true, phoneNumber: '+1234567890' },
        'http://localhost:3456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Messages.app not running');
    });
  });

  describe('message formatting', () => {
    const validSettings: ChannelSettings = {
      enabled: true,
      phoneNumber: '+1234567890',
    };

    it('should format task-complete message correctly', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      await channel.send(
        {
          type: 'task-complete',
          projectName: 'AwesomeProject',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      const calls = mockExeca.mock.calls as unknown[][];
      const scriptArg = calls[0]?.[1] as string[] | undefined;
      expect(scriptArg?.[1]).toContain('Task complete in AwesomeProject');
      expect(scriptArg?.[1]).toContain('http://test.local');
      expect(scriptArg?.[1]).toContain('GoGoGadgetClaude');
    });

    it('should format test type message correctly', async () => {
      mockExeca.mockResolvedValueOnce({} as never);

      await channel.send(
        {
          type: 'test',
          message: 'Custom test message',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      const calls = mockExeca.mock.calls as unknown[][];
      const scriptArg = calls[0]?.[1] as string[] | undefined;
      expect(scriptArg?.[1]).toContain('Custom test message');
    });
  });
});
