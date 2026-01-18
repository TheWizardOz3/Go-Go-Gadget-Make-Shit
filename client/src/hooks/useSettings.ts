/**
 * Hook for managing app settings
 *
 * Uses SWR for fetching and provides mutation function for updates.
 * Settings are stored in ~/.gogogadgetclaude/settings.json on the server.
 *
 * In cloud mode, settings are cached to localStorage since Modal doesn't
 * store settings. The cached settings are used as fallback.
 */

import useSWR from 'swr';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { api, getApiMode } from '@/lib/api';
import type { AppSettings, IMessageChannelSettings, NtfyChannelSettings } from '@shared/types';

// localStorage key for cached settings
const SETTINGS_CACHE_KEY = 'ggg_cached_settings';

/**
 * Cache settings to localStorage for offline/cloud mode access
 */
function cacheSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Get cached settings from localStorage
 */
function getCachedSettings(): AppSettings | null {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useSettings hook
 */
export interface UseSettingsReturn {
  /** Current settings */
  settings: AppSettings | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Whether an update is in progress */
  isUpdating: boolean;
  /** Update error (separate from fetch error) */
  updateError: Error | undefined;
  /** Function to update settings (partial update) */
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings | undefined>;
  /** Function to manually refresh the data */
  refresh: () => Promise<AppSettings | undefined>;
}

/**
 * Hook for managing app settings
 *
 * @returns Object containing settings, states, and mutation functions
 *
 * @example
 * ```tsx
 * const { settings, isLoading, updateSettings } = useSettings();
 *
 * // Toggle iMessage notifications
 * await updateSettings({
 *   channels: {
 *     ...settings.channels,
 *     imessage: { enabled: true, phoneNumber: '+1234567890' }
 *   }
 * });
 * ```
 */
export function useSettings(): UseSettingsReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<Error | undefined>(undefined);
  const mode = getApiMode();
  const isCloudMode = mode === 'cloud';

  // In cloud mode, don't fetch from API (it returns dummy data)
  const {
    data: apiData,
    error,
    isLoading,
    mutate,
  } = useSWR<AppSettings>(isCloudMode ? null : '/settings', fetcher<AppSettings>, {
    // No polling needed - settings don't change externally
    refreshInterval: 0,
    // Revalidate when window regains focus (user might have changed settings elsewhere)
    revalidateOnFocus: true,
    // Don't retry too aggressively
    errorRetryCount: 2,
  });

  // Cache settings when we get them from the local API
  useEffect(() => {
    if (apiData && !isCloudMode) {
      cacheSettings(apiData);
    }
  }, [apiData, isCloudMode]);

  // Use cached settings in cloud mode, or API data in local mode
  const settings = useMemo(() => {
    if (isCloudMode) {
      return getCachedSettings() ?? undefined;
    }
    return apiData;
  }, [isCloudMode, apiData]);

  /**
   * Update settings on the server and optimistically update the local cache
   * In cloud mode, only updates localStorage (no server to save to)
   */
  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>): Promise<AppSettings | undefined> => {
      setIsUpdating(true);
      setUpdateError(undefined);

      try {
        // In cloud mode, just update localStorage
        if (isCloudMode) {
          const current = getCachedSettings() ?? {};
          const updated = { ...current, ...partial } as AppSettings;
          cacheSettings(updated);
          // Trigger SWR revalidation to pick up new cached value
          mutate(updated, { revalidate: false });
          return updated;
        }

        // Local mode - update on server
        // Optimistic update
        const optimisticData = settings ? { ...settings, ...partial } : undefined;

        // Make API call and update cache
        const result = await mutate(
          async () => {
            const updated = await api.put<AppSettings>('/settings', partial);
            // Also cache the result
            cacheSettings(updated);
            return updated;
          },
          {
            // Use optimistic data while waiting
            optimisticData,
            // Revert on error
            rollbackOnError: true,
            // Don't revalidate immediately (we just set the data)
            revalidate: false,
          }
        );

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update settings');
        setUpdateError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [settings, mutate, isCloudMode]
  );

  return {
    settings,
    isLoading: isCloudMode ? false : isLoading,
    error: isCloudMode ? undefined : error,
    isUpdating,
    updateError,
    updateSettings,
    refresh: mutate,
  };
}

/**
 * Test notification settings for a specific channel
 */
export type TestNotificationSettings = IMessageChannelSettings | NtfyChannelSettings;

/**
 * Send a test notification to a specific channel
 *
 * @param channelId - The notification channel to test (e.g., 'imessage')
 * @param settings - Channel-specific settings for the test
 * @returns Promise that resolves when notification is sent
 * @throws Error if notification fails
 *
 * @example
 * ```tsx
 * // Send test iMessage
 * await sendTestNotification('imessage', { phoneNumber: '+1234567890' });
 * ```
 */
export async function sendTestNotification(
  channelId: string,
  settings: TestNotificationSettings
): Promise<{ sent: boolean; message: string }> {
  // In cloud mode, we can't test notifications (laptop not available)
  if (getApiMode() === 'cloud') {
    return {
      sent: false,
      message: 'Cannot test notifications in cloud mode. Connect to your laptop first.',
    };
  }

  return api.post<{ sent: boolean; message: string }>(`/notifications/${channelId}/test`, {
    channelId,
    settings,
  });
}

/**
 * @deprecated Use sendTestNotification('imessage', { phoneNumber }) instead
 *
 * Legacy function for sending a test iMessage notification.
 * Maintained for backward compatibility.
 */
export async function sendTestNotificationLegacy(
  phoneNumber: string,
  serverHostname?: string
): Promise<{ sent: boolean; message: string }> {
  return api.post<{ sent: boolean; message: string }>('/notifications/test', {
    phoneNumber,
    serverHostname,
  });
}
