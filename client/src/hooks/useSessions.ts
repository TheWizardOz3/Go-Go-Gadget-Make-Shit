/**
 * Hook for fetching sessions for a project
 *
 * Uses SWR for caching and automatic revalidation.
 * Merges local and cloud sessions when serverless is enabled.
 */

import useSWR from 'swr';
import { api, getApiMode } from '@/lib/api';
import type { SessionSummarySerialized, CloudSession, SessionStatus } from '@shared/types';

// ============================================================
// Types
// ============================================================

/**
 * Extended session summary with source indicator
 * Adds 'source' field for UI to distinguish local vs cloud sessions
 */
export interface MergedSessionSummary extends SessionSummarySerialized {
  /** Session source - 'local' or 'cloud' */
  source: 'local' | 'cloud';
  /** Project name (available for cloud sessions) */
  projectName?: string;
  /** Project path (available for cloud sessions) */
  projectPath?: string;
  /** Session status (available for cloud sessions) */
  status?: SessionStatus;
}

/**
 * Response from cloud sessions endpoint
 */
interface CloudSessionsResponse {
  sessions: CloudSession[];
  available: boolean;
  count: number;
  message?: string;
}

/**
 * Return type for useSessions hook
 */
export interface UseSessionsReturn {
  /** Array of merged sessions for the project (local + cloud) */
  sessions: MergedSessionSummary[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Whether cloud sessions are available */
  cloudAvailable: boolean;
  /** Number of cloud sessions included */
  cloudCount: number;
  /** Number of local sessions included */
  localCount: number;
  /** Function to manually refresh the data */
  refresh: () => Promise<MergedSessionSummary[] | undefined>;
}

// ============================================================
// Fetchers
// ============================================================

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Fetch local sessions from the laptop server
 */
async function fetchLocalSessions(encodedPath: string): Promise<SessionSummarySerialized[]> {
  try {
    return await api.get<SessionSummarySerialized[]>(`/projects/${encodedPath}/sessions`);
  } catch (err) {
    // If we're in cloud mode and can't reach local, that's expected
    if (getApiMode() === 'cloud') {
      console.debug('Local sessions unavailable in cloud mode');
      return [];
    }
    throw err;
  }
}

/**
 * Fetch cloud sessions from Modal
 */
async function fetchCloudSessions(projectPath?: string): Promise<CloudSessionsResponse> {
  try {
    const params = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : '';
    return await api.get<CloudSessionsResponse>(`/cloud/sessions${params}`);
  } catch (err) {
    // Cloud sessions are optional - don't fail the whole request
    console.debug(
      'Cloud sessions unavailable:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return { sessions: [], available: false, count: 0 };
  }
}

// ============================================================
// Utilities
// ============================================================

/**
 * Convert a local session to merged format
 */
function toMergedSession(session: SessionSummarySerialized): MergedSessionSummary {
  return {
    ...session,
    source: 'local',
  };
}

/**
 * Convert a cloud session to merged format
 */
function cloudToMergedSession(session: CloudSession): MergedSessionSummary {
  return {
    id: session.id,
    // Cloud sessions don't have a file path in the traditional sense
    filePath: `cloud://${session.projectPath}/${session.id}`,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    messageCount: session.messageCount,
    // Cloud sessions may not have a preview readily available
    preview: null,
    source: 'cloud',
    projectName: session.projectName,
    projectPath: session.projectPath,
    status: session.status,
  };
}

/**
 * Merge and sort local and cloud sessions
 * Sorts by lastActivityAt descending (most recent first)
 */
function mergeSessions(
  localSessions: SessionSummarySerialized[],
  cloudSessions: CloudSession[]
): MergedSessionSummary[] {
  const merged: MergedSessionSummary[] = [
    ...localSessions.map(toMergedSession),
    ...cloudSessions.map(cloudToMergedSession),
  ];

  // Sort by most recent activity
  merged.sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  });

  return merged;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Combined fetcher that gets both local and cloud sessions
 */
async function fetchMergedSessions(
  encodedPath: string,
  projectPath?: string
): Promise<{
  sessions: MergedSessionSummary[];
  cloudAvailable: boolean;
  cloudCount: number;
  localCount: number;
}> {
  // Fetch both in parallel
  const [localSessions, cloudResponse] = await Promise.all([
    fetchLocalSessions(encodedPath),
    fetchCloudSessions(projectPath),
  ]);

  const merged = mergeSessions(localSessions, cloudResponse.sessions);

  return {
    sessions: merged,
    cloudAvailable: cloudResponse.available,
    cloudCount: cloudResponse.count,
    localCount: localSessions.length,
  };
}

/**
 * Hook for fetching sessions for a specific project
 *
 * Fetches both local and cloud sessions, merging them into a single list.
 * Cloud sessions are fetched in parallel and won't block local sessions.
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param projectPath - Optional decoded project path for cloud session filtering
 * @returns Object containing merged sessions, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { sessions, isLoading, cloudAvailable } = useSessions(
 *   project.encodedPath,
 *   project.path
 * );
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <SessionList sessions={sessions}>
 *     {cloudAvailable && <Badge>Cloud connected</Badge>}
 *   </SessionList>
 * );
 * ```
 */
export function useSessions(encodedPath: string | null, projectPath?: string): UseSessionsReturn {
  // Create a cache key that includes both paths
  const cacheKey = encodedPath ? ['sessions', encodedPath, projectPath || ''].join(':') : null;

  const { data, error, isLoading, mutate } = useSWR<{
    sessions: MergedSessionSummary[];
    cloudAvailable: boolean;
    cloudCount: number;
    localCount: number;
  }>(
    cacheKey,
    // Only fetch if we have a project path
    () =>
      encodedPath
        ? fetchMergedSessions(encodedPath, projectPath)
        : Promise.resolve({
            sessions: [],
            cloudAvailable: false,
            cloudCount: 0,
            localCount: 0,
          }),
    {
      // Revalidate every 10 seconds
      refreshInterval: 10000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry too aggressively for cloud failures
      errorRetryCount: 2,
    }
  );

  return {
    sessions: data?.sessions,
    isLoading,
    error,
    cloudAvailable: data?.cloudAvailable ?? false,
    cloudCount: data?.cloudCount ?? 0,
    localCount: data?.localCount ?? 0,
    refresh: async () => {
      const result = await mutate();
      return result?.sessions;
    },
  };
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Check if a session is a cloud session
 */
export function isCloudSession(session: MergedSessionSummary): boolean {
  return session.source === 'cloud';
}

/**
 * Check if a session is a local session
 */
export function isLocalSession(session: MergedSessionSummary): boolean {
  return session.source === 'local';
}

// ============================================================
// Legacy Hook (for backward compatibility)
// ============================================================

/**
 * @deprecated Use useSessions with projectPath parameter instead
 *
 * Legacy version that only fetches local sessions.
 * Maintained for backward compatibility.
 */
export function useLocalSessions(encodedPath: string | null): {
  sessions: SessionSummarySerialized[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<SessionSummarySerialized[] | undefined>;
} {
  const { data, error, isLoading, mutate } = useSWR<SessionSummarySerialized[]>(
    encodedPath ? `/projects/${encodedPath}/sessions` : null,
    fetcher<SessionSummarySerialized[]>,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
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
