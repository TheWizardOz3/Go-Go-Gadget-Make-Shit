/**
 * Hook for fetching and polling conversation messages
 *
 * Uses SWR for caching, deduplication, and automatic polling.
 * Supports both local and cloud sessions.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';
import type { MessagesResponse, MessageSerialized, SessionStatus } from '@shared/types';

/** Polling interval in milliseconds (2.5 seconds) */
const POLL_INTERVAL_MS = 2500;

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/** Options for useConversation hook */
export interface UseConversationOptions {
  /** Session source - 'local' or 'cloud' (default: 'local') */
  source?: 'local' | 'cloud';
  /** Project path for cloud sessions (required if source is 'cloud') */
  projectPath?: string;
}

/**
 * Return type for useConversation hook
 */
export interface UseConversationReturn {
  /** Array of messages in the conversation */
  messages: MessageSerialized[] | undefined;
  /** Current session status (working/waiting/idle) */
  status: SessionStatus | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<MessagesResponse | undefined>;
  /** Whether data is being revalidated (refetching) */
  isValidating: boolean;
}

/**
 * Hook for fetching conversation messages with automatic polling
 *
 * Supports both local and cloud sessions. For cloud sessions, pass
 * source: 'cloud' and the projectPath in options.
 *
 * @param sessionId - The session ID to fetch messages for, or null to disable
 * @param options - Optional configuration for cloud sessions
 * @returns Object containing messages, status, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * // Local session
 * const { messages, status, isLoading } = useConversation(sessionId);
 *
 * // Cloud session
 * const { messages, status, isLoading } = useConversation(sessionId, {
 *   source: 'cloud',
 *   projectPath: 'cloud--tmp-repos-MyProject'
 * });
 * ```
 */
export function useConversation(
  sessionId: string | null,
  options?: UseConversationOptions
): UseConversationReturn {
  const { source = 'local', projectPath } = options || {};

  // Build the endpoint path based on source
  const getEndpointPath = (): string | null => {
    if (!sessionId) return null;

    if (source === 'cloud' && projectPath) {
      // Use cloud endpoint with projectPath query param
      return `/cloud/sessions/${sessionId}/messages?projectPath=${encodeURIComponent(projectPath)}`;
    }

    // Default to local endpoint
    return `/sessions/${sessionId}/messages`;
  };

  const endpointPath = getEndpointPath();

  const { data, error, isLoading, isValidating, mutate } = useSWR<MessagesResponse>(
    // Only fetch if sessionId is provided (conditional fetching)
    endpointPath,
    fetcher<MessagesResponse>,
    {
      // Poll every 2.5 seconds for new messages
      refreshInterval: POLL_INTERVAL_MS,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry on error (we'll show error state)
      errorRetryCount: 3,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  );

  return {
    messages: data?.messages,
    status: data?.status,
    isLoading,
    error,
    refresh: mutate,
    isValidating,
  };
}
