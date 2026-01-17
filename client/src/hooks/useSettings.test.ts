/**
 * Tests for useSettings hook
 *
 * Tests the API integration, mutation behavior, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';
import { useSettings, sendTestNotification } from './useSettings';
import { api } from '@/lib/api';
import type { AppSettings } from '@shared/types';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

// Mock settings data
const mockSettings: AppSettings = {
  notificationsEnabled: false,
  notificationPhoneNumber: undefined,
  defaultTemplates: [],
  theme: 'system',
};

/**
 * Wrapper that provides a fresh SWR cache for each test
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      {
        value: {
          provider: () => new Map(),
          dedupingInterval: 0,
        },
      },
      children
    );
  };
}

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with loading state', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.settings).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('successful fetch', () => {
    it('should fetch settings on mount', async () => {
      mockApi.get.mockResolvedValueOnce(mockSettings);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(mockApi.get).toHaveBeenCalledWith('/settings');
    });

    it('should return settings with notifications enabled', async () => {
      const enabledSettings: AppSettings = {
        ...mockSettings,
        notificationsEnabled: true,
        notificationPhoneNumber: '+1234567890',
      };
      mockApi.get.mockResolvedValueOnce(enabledSettings);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.settings?.notificationsEnabled).toBe(true);
      });

      expect(result.current.settings?.notificationPhoneNumber).toBe('+1234567890');
    });
  });

  describe('error handling', () => {
    it('should set error state on fetch failure', async () => {
      const error = new Error('Failed to fetch settings');
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update settings via API', async () => {
      mockApi.get.mockResolvedValueOnce(mockSettings);
      const updatedSettings: AppSettings = {
        ...mockSettings,
        notificationsEnabled: true,
      };
      mockApi.put.mockResolvedValueOnce(updatedSettings);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSettings({ notificationsEnabled: true });
      });

      expect(mockApi.put).toHaveBeenCalledWith('/settings', { notificationsEnabled: true });
    });

    it('should set isUpdating during update', async () => {
      mockApi.get.mockResolvedValueOnce(mockSettings);
      mockApi.put.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSettings), 100))
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updatePromise: Promise<unknown>;
      act(() => {
        updatePromise = result.current.updateSettings({ notificationsEnabled: true });
      });

      expect(result.current.isUpdating).toBe(true);

      await act(async () => {
        await updatePromise;
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('should set updateError on failure', async () => {
      mockApi.get.mockResolvedValueOnce(mockSettings);
      mockApi.put.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.updateSettings({ notificationsEnabled: true });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.updateError).toBeDefined();
    });
  });

  describe('return value structure', () => {
    it('should return correct shape', async () => {
      mockApi.get.mockResolvedValueOnce(mockSettings);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('settings');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isUpdating');
      expect(result.current).toHaveProperty('updateError');
      expect(result.current).toHaveProperty('updateSettings');
      expect(result.current).toHaveProperty('refresh');
      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });
});

describe('sendTestNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API with channel ID and settings', async () => {
    mockApi.post.mockResolvedValueOnce({ sent: true, message: 'Test notification sent' });

    const result = await sendTestNotification('imessage', {
      enabled: true,
      phoneNumber: '+1234567890',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/notifications/imessage/test', {
      channelId: 'imessage',
      settings: { enabled: true, phoneNumber: '+1234567890' },
    });
    expect(result.sent).toBe(true);
  });

  it('should return result from API', async () => {
    mockApi.post.mockResolvedValueOnce({ sent: false, message: 'Failed to send' });

    const result = await sendTestNotification('imessage', {
      enabled: true,
      phoneNumber: '+1234567890',
    });

    expect(result.sent).toBe(false);
    expect(result.message).toBe('Failed to send');
  });
});
