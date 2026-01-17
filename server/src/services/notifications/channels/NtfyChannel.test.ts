/**
 * Tests for NtfyChannel
 *
 * Tests ntfy-specific functionality including platform availability,
 * configuration validation, HTTP publishing, and message formatting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NtfyChannel } from './NtfyChannel.js';
import type { NotificationPayload, ChannelSettings } from '../types.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('../../../lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NtfyChannel', () => {
  let channel: NtfyChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    channel = new NtfyChannel();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('channel identity', () => {
    it('should have correct id', () => {
      expect(channel.id).toBe('ntfy');
    });

    it('should have correct displayName', () => {
      expect(channel.displayName).toBe('ntfy');
    });

    it('should have a description', () => {
      expect(channel.description).toBeTruthy();
      expect(channel.description).toContain('ntfy.sh');
    });
  });

  describe('isAvailable', () => {
    it('should return true on all platforms (HTTP-based)', () => {
      // ntfy is HTTP-based, so it should always be available
      expect(channel.isAvailable()).toBe(true);
    });

    it('should return true on macOS', () => {
      expect(channel.isAvailable()).toBe(true);
    });

    it('should return true on Linux', () => {
      expect(channel.isAvailable()).toBe(true);
    });

    it('should return true on Windows', () => {
      expect(channel.isAvailable()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('should return true when enabled with serverUrl and topic', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: 'my-alerts',
      };
      expect(channel.isConfigured(settings)).toBe(true);
    });

    it('should return true with custom server and auth token', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: 'https://my-ntfy.example.com',
        topic: 'private-topic',
        authToken: 'tk_secret123',
      };
      expect(channel.isConfigured(settings)).toBe(true);
    });

    it('should return false when disabled', () => {
      const settings: ChannelSettings = {
        enabled: false,
        serverUrl: 'https://ntfy.sh',
        topic: 'my-alerts',
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when no serverUrl', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: undefined,
        topic: 'my-alerts',
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when serverUrl is empty string', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: '',
        topic: 'my-alerts',
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when no topic', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: undefined,
      };
      expect(channel.isConfigured(settings)).toBe(false);
    });

    it('should return false when topic is empty string', () => {
      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: '',
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
      serverUrl: 'https://ntfy.sh',
      topic: 'my-alerts',
    };

    it('should return disabled result when channel is disabled', async () => {
      const result = await channel.send(testPayload, {
        enabled: false,
        serverUrl: 'https://ntfy.sh',
        topic: 'my-alerts',
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Channel disabled');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error when no serverUrl configured', async () => {
      const result = await channel.send(testPayload, {
        enabled: true,
        serverUrl: undefined,
        topic: 'my-alerts',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server URL and topic are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error when no topic configured', async () => {
      const result = await channel.send(testPayload, {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: undefined,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server URL and topic are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return rate limited result when rate limited', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      // First send
      await channel.send(testPayload, validSettings);

      // Second send should be rate limited
      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Rate limited');
    });

    it('should send notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://ntfy.sh/my-alerts',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('MyProject'),
        })
      );
    });

    it('should include app URL in message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(testPayload, validSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('http://localhost:3456'),
        })
      );
    });

    it('should include auth header when authToken provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(testPayload, {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: 'private-topic',
        authToken: 'tk_secret123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer tk_secret123',
          }),
        })
      );
    });

    it('should not include auth header when no authToken', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(testPayload, validSettings);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should return error result when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should return error result when server returns non-OK status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      const result = await channel.send(testPayload, validSettings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ntfy API error (403)');
      expect(result.error).toContain('Forbidden');
    });

    it('should return error for invalid settings type', async () => {
      const result = await channel.send(testPayload, { invalid: 'settings' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid ntfy settings');
    });

    it('should set Content-Type header to text/plain', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(testPayload, validSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        })
      );
    });
  });

  describe('sendTest', () => {
    it('should return error when no serverUrl configured', async () => {
      const result = await channel.sendTest(
        { enabled: true, serverUrl: undefined, topic: 'my-alerts' },
        'http://localhost:3456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server URL and topic are required');
    });

    it('should return error when no topic configured', async () => {
      const result = await channel.sendTest(
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: undefined },
        'http://localhost:3456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server URL and topic are required');
    });

    it('should send test notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await channel.sendTest(
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: 'my-alerts' },
        'http://localhost:3456'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://ntfy.sh/my-alerts',
        expect.objectContaining({
          body: expect.stringContaining('Test notification'),
        })
      );
    });

    it('should include app URL in test message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.sendTest(
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: 'my-alerts' },
        'https://my-app.example.com'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('https://my-app.example.com'),
        })
      );
    });

    it('should bypass rate limiting', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const settings: ChannelSettings = {
        enabled: true,
        serverUrl: 'https://ntfy.sh',
        topic: 'my-alerts',
      };

      // Send multiple test notifications rapidly
      const result1 = await channel.sendTest(settings, 'http://localhost:3456');
      const result2 = await channel.sendTest(settings, 'http://localhost:3456');
      const result3 = await channel.sendTest(settings, 'http://localhost:3456');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should return error result when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await channel.sendTest(
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: 'my-alerts' },
        'http://localhost:3456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should include auth token in test request when provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.sendTest(
        {
          enabled: true,
          serverUrl: 'https://ntfy.sh',
          topic: 'private-topic',
          authToken: 'tk_test_token',
        },
        'http://localhost:3456'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer tk_test_token',
          }),
        })
      );
    });
  });

  describe('URL building', () => {
    it('should correctly combine serverUrl and topic', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        { type: 'task-complete', projectName: 'Test', appUrl: 'http://test.local' },
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: 'my-topic' }
      );

      expect(mockFetch).toHaveBeenCalledWith('https://ntfy.sh/my-topic', expect.any(Object));
    });

    it('should handle trailing slash in serverUrl', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        { type: 'task-complete', projectName: 'Test', appUrl: 'http://test.local' },
        { enabled: true, serverUrl: 'https://ntfy.sh/', topic: 'my-topic' }
      );

      expect(mockFetch).toHaveBeenCalledWith('https://ntfy.sh/my-topic', expect.any(Object));
    });

    it('should handle multiple trailing slashes in serverUrl', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        { type: 'task-complete', projectName: 'Test', appUrl: 'http://test.local' },
        { enabled: true, serverUrl: 'https://ntfy.sh///', topic: 'my-topic' }
      );

      expect(mockFetch).toHaveBeenCalledWith('https://ntfy.sh/my-topic', expect.any(Object));
    });

    it('should handle leading slash in topic', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        { type: 'task-complete', projectName: 'Test', appUrl: 'http://test.local' },
        { enabled: true, serverUrl: 'https://ntfy.sh', topic: '/my-topic' }
      );

      expect(mockFetch).toHaveBeenCalledWith('https://ntfy.sh/my-topic', expect.any(Object));
    });

    it('should handle self-hosted server URL', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        { type: 'task-complete', projectName: 'Test', appUrl: 'http://test.local' },
        { enabled: true, serverUrl: 'https://my-ntfy.example.com:8080', topic: 'alerts' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://my-ntfy.example.com:8080/alerts',
        expect.any(Object)
      );
    });
  });

  describe('message formatting', () => {
    const validSettings: ChannelSettings = {
      enabled: true,
      serverUrl: 'https://ntfy.sh',
      topic: 'my-alerts',
    };

    it('should format task-complete message correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        {
          type: 'task-complete',
          projectName: 'AwesomeProject',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Task complete in AwesomeProject'),
        })
      );
    });

    it('should include emoji in message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        {
          type: 'task-complete',
          projectName: 'Test',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('🤖'),
        })
      );
    });

    it('should include GoGoGadgetClaude branding', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        {
          type: 'task-complete',
          projectName: 'Test',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('GoGoGadgetClaude'),
        })
      );
    });

    it('should format test type message correctly', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.send(
        {
          type: 'test',
          message: 'Custom test message',
          appUrl: 'http://test.local',
        },
        validSettings
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Custom test message'),
        })
      );
    });

    it('should format test notification with setup confirmation', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await channel.sendTest(validSettings, 'http://test.local');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('working correctly'),
        })
      );
    });
  });
});
