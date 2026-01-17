/**
 * Hook for managing app settings
 *
 * Uses SWR for fetching and provides mutation function for updates.
 * Settings are stored in ~/.gogogadgetclaude/settings.json on the server.
 */

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { AppSettings, IMessageChannelSettings, NtfyChannelSettings } from '@shared/types';

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

  const { data, error, isLoading, mutate } = useSWR<AppSettings>(
    '/settings',
    fetcher<AppSettings>,
    {
      // No polling needed - settings don't change externally
      refreshInterval: 0,
      // Revalidate when window regains focus (user might have changed settings elsewhere)
      revalidateOnFocus: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  /**
   * Update settings on the server and optimistically update the local cache
   */
  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>): Promise<AppSettings | undefined> => {
      setIsUpdating(true);
      setUpdateError(undefined);

      try {
        // Optimistic update
        const optimisticData = data ? { ...data, ...partial } : undefined;

        // Make API call and update cache
        const result = await mutate(
          async () => {
            const updated = await api.put<AppSettings>('/settings', partial);
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
    [data, mutate]
  );

  return {
    settings: data,
    isLoading,
    error,
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
