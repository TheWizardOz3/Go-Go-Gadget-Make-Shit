/**
 * Tests for Settings Service
 *
 * Tests reading, writing, validation, migration, and default handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSettings, updateSettings, getSettingsPath } from './settingsService.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
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

import { readFile, writeFile, mkdir } from 'fs/promises';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettingsPath', () => {
    it('should return path in home directory', () => {
      const path = getSettingsPath();
      expect(path).toBe('/mock/home/.gogogadgetclaude/settings.json');
    });
  });

  describe('getSettings', () => {
    it('should return default settings when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValueOnce(error);
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const settings = await getSettings();

      expect(settings).toEqual({
        defaultTemplates: [],
        theme: 'system',
        channels: {
          imessage: { enabled: false },
        },
      });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should read and parse existing settings file with new structure', async () => {
      const existingSettings = {
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1234567890',
          },
        },
        defaultTemplates: [],
        theme: 'dark',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));

      const settings = await getSettings();

      expect(settings).toEqual(existingSettings);
    });

    it('should migrate legacy settings to channel-based structure', async () => {
      const legacySettings = {
        notificationsEnabled: true,
        notificationPhoneNumber: '+1234567890',
        defaultTemplates: [],
        theme: 'dark',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(legacySettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const settings = await getSettings();

      // Should be migrated to new structure
      expect(settings.channels?.imessage?.enabled).toBe(true);
      expect(settings.channels?.imessage?.phoneNumber).toBe('+1234567890');
      // Legacy fields should be removed
      expect(settings.notificationsEnabled).toBeUndefined();
      expect(settings.notificationPhoneNumber).toBeUndefined();
      // Other settings preserved
      expect(settings.theme).toBe('dark');
    });

    it('should return defaults for invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('not valid json');
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const settings = await getSettings();

      expect(settings).toEqual({
        defaultTemplates: [],
        theme: 'system',
        channels: {
          imessage: { enabled: false },
        },
      });
    });

    it('should return defaults for invalid settings schema', async () => {
      const invalidSettings = {
        theme: 'invalid-theme',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const settings = await getSettings();

      expect(settings).toEqual({
        defaultTemplates: [],
        theme: 'system',
        channels: {
          imessage: { enabled: false },
        },
      });
    });

    it('should not migrate if channels already exists', async () => {
      const alreadyMigratedSettings = {
        channels: {
          imessage: {
            enabled: true,
            phoneNumber: '+1111111111',
          },
        },
        defaultTemplates: [],
        theme: 'light',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(alreadyMigratedSettings));

      const settings = await getSettings();

      // Should not write (no migration needed)
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(settings).toEqual(alreadyMigratedSettings);
    });
  });

  describe('updateSettings', () => {
    it('should merge partial updates with existing settings', async () => {
      const existingSettings = {
        channels: {
          imessage: { enabled: false },
        },
        defaultTemplates: [],
        theme: 'light',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const updated = await updateSettings({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1234567890' },
        },
      });

      expect(updated.channels?.imessage?.enabled).toBe(true);
      expect(updated.channels?.imessage?.phoneNumber).toBe('+1234567890');
      expect(updated.theme).toBe('light'); // Preserved
    });

    it('should update channel settings', async () => {
      const existingSettings = {
        channels: {
          imessage: { enabled: true, phoneNumber: '+1111111111' },
        },
        defaultTemplates: [],
        theme: 'system',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const updated = await updateSettings({
        channels: {
          imessage: { enabled: true, phoneNumber: '+1987654321' },
        },
      });

      expect(updated.channels?.imessage?.phoneNumber).toBe('+1987654321');
    });

    it('should write updated settings to file', async () => {
      const existingSettings = {
        channels: {
          imessage: { enabled: false },
        },
        defaultTemplates: [],
        theme: 'system',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      await updateSettings({ theme: 'dark' });

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/mock/home/.gogogadgetclaude/settings.json',
        expect.stringMatching(/"theme":\s*"dark"/),
        'utf-8'
      );
    });

    it('should throw error for invalid settings values', async () => {
      await expect(
        updateSettings({ theme: 'invalid' as 'light' | 'dark' | 'system' })
      ).rejects.toThrow();
    });

    it('should create settings directory if it does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValueOnce(error);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await updateSettings({
        channels: {
          imessage: { enabled: true },
        },
      });

      expect(mockMkdir).toHaveBeenCalledWith('/mock/home/.gogogadgetclaude', { recursive: true });
    });
  });
});
