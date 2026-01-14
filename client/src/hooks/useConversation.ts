/**
 * Hook for fetching and polling conversation messages
 *
 * Uses SWR for caching, deduplication, and automatic polling.
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
 * @param sessionId - The session ID to fetch messages for, or null to disable
 * @returns Object containing messages, status, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { messages, status, isLoading, error, refresh } = useConversation(sessionId);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} onRetry={refresh} />;
 * return <MessageList messages={messages} />;
 * ```
 */
export function useConversation(sessionId: string | null): UseConversationReturn {
  const { data, error, isLoading, isValidating, mutate } = useSWR<MessagesResponse>(
    // Only fetch if sessionId is provided (conditional fetching)
    sessionId ? `/sessions/${sessionId}/messages` : null,
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
