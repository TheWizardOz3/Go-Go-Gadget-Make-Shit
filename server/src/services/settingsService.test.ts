/**
 * Tests for Settings Service
 *
 * Tests reading, writing, validation, and default handling.
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
        notificationsEnabled: false,
        notificationPhoneNumber: undefined,
        defaultTemplates: [],
        theme: 'system',
      });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should read and parse existing settings file', async () => {
      const existingSettings = {
        notificationsEnabled: true,
        notificationPhoneNumber: '+1234567890',
        defaultTemplates: [],
        theme: 'dark',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));

      const settings = await getSettings();

      expect(settings).toEqual(existingSettings);
    });

    it('should merge partial settings with defaults', async () => {
      const partialSettings = {
        notificationsEnabled: true,
        // Missing other fields
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(partialSettings));

      const settings = await getSettings();

      expect(settings.notificationsEnabled).toBe(true);
      expect(settings.theme).toBe('system'); // Default
      expect(settings.defaultTemplates).toEqual([]); // Default
    });

    it('should return defaults for invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('not valid json');

      const settings = await getSettings();

      expect(settings).toEqual({
        notificationsEnabled: false,
        notificationPhoneNumber: undefined,
        defaultTemplates: [],
        theme: 'system',
      });
    });

    it('should return defaults for invalid settings schema', async () => {
      const invalidSettings = {
        notificationsEnabled: 'not a boolean',
        theme: 'invalid-theme',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidSettings));

      const settings = await getSettings();

      expect(settings).toEqual({
        notificationsEnabled: false,
        notificationPhoneNumber: undefined,
        defaultTemplates: [],
        theme: 'system',
      });
    });
  });

  describe('updateSettings', () => {
    it('should merge partial updates with existing settings', async () => {
      const existingSettings = {
        notificationsEnabled: false,
        defaultTemplates: [],
        theme: 'light',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const updated = await updateSettings({ notificationsEnabled: true });

      expect(updated.notificationsEnabled).toBe(true);
      expect(updated.theme).toBe('light'); // Preserved
    });

    it('should update phone number', async () => {
      const existingSettings = {
        notificationsEnabled: true,
        defaultTemplates: [],
        theme: 'system',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingSettings));
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const updated = await updateSettings({ notificationPhoneNumber: '+1987654321' });

      expect(updated.notificationPhoneNumber).toBe('+1987654321');
    });

    it('should write updated settings to file', async () => {
      const existingSettings = {
        notificationsEnabled: false,
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

      await updateSettings({ notificationsEnabled: true });

      expect(mockMkdir).toHaveBeenCalledWith('/mock/home/.gogogadgetclaude', { recursive: true });
    });
  });
});
