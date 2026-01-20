/**
 * Hook for managing scheduled prompts
 *
 * Provides CRUD operations for scheduled prompts with SWR caching.
 * Scheduled prompts automatically start new Claude sessions at specified times.
 */

import useSWR from 'swr';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  ScheduledPrompt,
  ScheduledPromptInput,
  ScheduleType,
} from '../../../shared/types/index';

// Re-export types for convenience
export type { ScheduledPrompt, ScheduledPromptInput, ScheduleType };

// ============================================================
// Types
// ============================================================

/**
 * Return type for useScheduledPrompts hook
 */
/** Result of running a prompt manually */
export interface RunPromptResult {
  executed: boolean;
  promptId: string;
  timestamp: string;
  message: string;
}

export interface UseScheduledPromptsReturn {
  /** Array of scheduled prompts */
  prompts: ScheduledPrompt[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<ScheduledPrompt[] | undefined>;
  /** Create a new scheduled prompt */
  createPrompt: (input: ScheduledPromptInput) => Promise<ScheduledPrompt>;
  /** Update an existing prompt */
  updatePrompt: (id: string, input: Partial<ScheduledPromptInput>) => Promise<ScheduledPrompt>;
  /** Delete a prompt */
  deletePrompt: (id: string) => Promise<void>;
  /** Toggle a prompt's enabled state */
  togglePrompt: (id: string) => Promise<ScheduledPrompt>;
  /** Manually run a prompt now */
  runPrompt: (id: string) => Promise<RunPromptResult>;
}

// ============================================================
// Fetcher
// ============================================================

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook for managing scheduled prompts
 *
 * Provides CRUD operations with optimistic updates and SWR caching.
 *
 * @returns Object containing prompts, loading state, error, and mutation functions
 *
 * @example
 * ```tsx
 * const { prompts, isLoading, createPrompt, togglePrompt } = useScheduledPrompts();
 *
 * // Create a new daily prompt
 * await createPrompt({
 *   prompt: 'Check for updates',
 *   scheduleType: 'daily',
 *   timeOfDay: '09:00',
 *   projectPath: null, // Global
 * });
 *
 * // Toggle a prompt on/off
 * await togglePrompt(prompt.id);
 * ```
 */
export function useScheduledPrompts(): UseScheduledPromptsReturn {
  const { data, error, isLoading, mutate } = useSWR<ScheduledPrompt[]>(
    '/scheduled-prompts',
    fetcher<ScheduledPrompt[]>,
    {
      // Refresh every 30 seconds to pick up execution updates
      refreshInterval: 30000,
      // Don't revalidate on focus (can be noisy)
      revalidateOnFocus: false,
      // Dedupe requests
      dedupingInterval: 5000,
    }
  );

  /**
   * Create a new scheduled prompt
   */
  const createPrompt = useCallback(
    async (input: ScheduledPromptInput): Promise<ScheduledPrompt> => {
      const newPrompt = await api.post<ScheduledPrompt>('/scheduled-prompts', input);

      // Update local cache with new prompt
      await mutate((current) => (current ? [...current, newPrompt] : [newPrompt]), false);

      return newPrompt;
    },
    [mutate]
  );

  /**
   * Update an existing prompt
   */
  const updatePrompt = useCallback(
    async (id: string, input: Partial<ScheduledPromptInput>): Promise<ScheduledPrompt> => {
      const updated = await api.put<ScheduledPrompt>(`/scheduled-prompts/${id}`, input);

      // Update local cache
      await mutate((current) => current?.map((p) => (p.id === id ? updated : p)), false);

      return updated;
    },
    [mutate]
  );

  /**
   * Delete a prompt
   */
  const deletePrompt = useCallback(
    async (id: string): Promise<void> => {
      await api.delete(`/scheduled-prompts/${id}`);

      // Update local cache by removing the prompt
      await mutate((current) => current?.filter((p) => p.id !== id), false);
    },
    [mutate]
  );

  /**
   * Toggle a prompt's enabled state
   */
  const togglePrompt = useCallback(
    async (id: string): Promise<ScheduledPrompt> => {
      const toggled = await api.patch<ScheduledPrompt>(`/scheduled-prompts/${id}/toggle`);

      // Update local cache
      await mutate((current) => current?.map((p) => (p.id === id ? toggled : p)), false);

      return toggled;
    },
    [mutate]
  );

  /**
   * Manually run a prompt now
   */
  const runPrompt = useCallback(
    async (id: string): Promise<RunPromptResult> => {
      const result = await api.post<RunPromptResult>(`/scheduled-prompts/${id}/run`, {});

      // Refresh data to get updated lastExecution and nextRunAt
      await mutate();

      return result;
    },
    [mutate]
  );

  return {
    prompts: data,
    isLoading,
    error,
    refresh: mutate,
    createPrompt,
    updatePrompt,
    deletePrompt,
    togglePrompt,
    runPrompt,
  };
}

// ============================================================
// Utility Functions
// ============================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format time for display (e.g., "9:00 AM")
 */
export function formatTime(timeOfDay: string): string {
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get a human-readable description of a schedule
 */
export function getScheduleDescription(prompt: ScheduledPrompt): string {
  const time = formatTime(prompt.timeOfDay);

  switch (prompt.scheduleType) {
    case 'daily':
      return `Daily at ${time}`;
    case 'weekly':
      return `${DAYS_OF_WEEK[prompt.dayOfWeek!]} at ${time}`;
    case 'monthly':
      return `${getOrdinal(prompt.dayOfMonth!)} of month at ${time}`;
    case 'yearly':
      return `Jan 1st at ${time}`;
    default:
      return 'Unknown schedule';
  }
}

/**
 * Check if a prompt was missed (nextRunAt is in the past)
 */
export function isPromptMissed(prompt: ScheduledPrompt): boolean {
  if (!prompt.nextRunAt || !prompt.enabled) return false;
  return new Date(prompt.nextRunAt) < new Date();
}

/**
 * Format the next run time for display
 */
export function formatNextRun(nextRunAt: string | undefined): string {
  if (!nextRunAt) return 'Not scheduled';

  const next = new Date(nextRunAt);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();

  // If in the past, it was missed
  if (diffMs < 0) return 'Missed - tap to run';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Less than a minute';
  if (diffMins < 60) return `In ${diffMins} min`;
  if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;

  // Format as date
  return next.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format the last execution for display
 */
export function formatLastExecution(prompt: ScheduledPrompt): string | null {
  if (!prompt.lastExecution) return null;

  const { timestamp, status, error } = prompt.lastExecution;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let timeAgo: string;
  if (diffMins < 1) timeAgo = 'Just now';
  else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
  else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
  else timeAgo = date.toLocaleDateString();

  if (status === 'success') {
    return `✓ ${timeAgo}`;
  } else {
    return `✗ ${timeAgo}${error ? `: ${error}` : ''}`;
  }
}
