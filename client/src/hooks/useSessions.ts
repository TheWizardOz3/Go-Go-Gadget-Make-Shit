/**
 * Hook for fetching sessions for a project
 *
 * Uses SWR for caching and automatic revalidation.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';
import type { SessionSummarySerialized } from '@shared/types';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useSessions hook
 */
export interface UseSessionsReturn {
  /** Array of sessions for the project */
  sessions: SessionSummarySerialized[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<SessionSummarySerialized[] | undefined>;
}

/**
 * Hook for fetching sessions for a specific project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @returns Object containing sessions, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { sessions, isLoading, error } = useSessions(project.encodedPath);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * return <SessionList sessions={sessions} />;
 * ```
 */
export function useSessions(encodedPath: string | null): UseSessionsReturn {
  const { data, error, isLoading, mutate } = useSWR<SessionSummarySerialized[]>(
    // Only fetch if we have a project path
    encodedPath ? `/projects/${encodedPath}/sessions` : null,
    fetcher<SessionSummarySerialized[]>,
    {
      // Revalidate every 10 seconds
      refreshInterval: 10000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
    }
  );

  return {
    sessions: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
