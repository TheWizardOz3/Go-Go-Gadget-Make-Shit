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
  /** Unified project identifier for cross-environment matching */
  projectIdentifier?: string;
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
 * Get the laptop API URL for direct requests
 * Used when in cloud mode to still fetch local sessions if laptop is reachable
 */
function getLaptopUrl(): string | null {
  // In development, always use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3457';
  }
  // In production, use configured URL (e.g., Tailscale URL)
  return import.meta.env.VITE_LAPTOP_API_URL || null;
}

/**
 * Fetch local sessions from the laptop server
 *
 * When in cloud mode, explicitly calls the laptop URL to get local sessions.
 * This allows seeing both local and cloud sessions regardless of current mode.
 */
async function fetchLocalSessions(encodedPath: string): Promise<SessionSummarySerialized[]> {
  const currentMode = getApiMode();

  // In cloud mode, try to fetch from laptop directly
  if (currentMode === 'cloud') {
    const laptopUrl = getLaptopUrl();
    if (!laptopUrl) {
      // No laptop URL configured - can't fetch local sessions
      return [];
    }

    try {
      // Make direct request to laptop API
      return await api.get<SessionSummarySerialized[]>(`/projects/${encodedPath}/sessions`, {
        baseUrl: laptopUrl,
        timeout: 5000,
      });
    } catch {
      // Laptop unreachable in cloud mode - this is expected when laptop is asleep
      return [];
    }
  }

  // In local mode, use the default API client (which points to laptop)
  return api.get<SessionSummarySerialized[]>(`/projects/${encodedPath}/sessions`);
}

/**
 * Fetch cloud sessions from Modal
 * Uses projectIdentifier for matching when available, falls back to name matching
 */
async function fetchCloudSessions(
  projectPath?: string,
  projectIdentifier?: string
): Promise<CloudSessionsResponse> {
  try {
    // Fetch all cloud sessions (don't filter on server, filter on client)
    // Modal stores paths as "-tmp-repos-{projectName}" which doesn't match local paths
    const response = await api.get<CloudSessionsResponse>('/cloud/sessions');

    // If we have a project identifier or path, filter sessions
    if ((projectIdentifier || projectPath) && response.sessions) {
      // Extract project name from local path (e.g., "/Users/.../Knowledge" -> "Knowledge")
      const projectName = projectPath?.split('/').pop() || '';

      // Filter sessions that match this project
      const filteredSessions = response.sessions.filter((session) => {
        // Priority 1: Match by projectIdentifier (git remote URL)
        if (projectIdentifier && session.projectIdentifier) {
          return (
            normalizeProjectIdentifier(session.projectIdentifier) ===
            normalizeProjectIdentifier(projectIdentifier)
          );
        }

        // Priority 2: Fall back to name matching
        // Cloud sessions have paths like "-tmp-repos-Knowledge"
        const cloudProjectName = session.projectPath?.split('-').pop() || '';
        return cloudProjectName.toLowerCase() === projectName.toLowerCase();
      });

      return {
        ...response,
        sessions: filteredSessions,
        count: filteredSessions.length,
      };
    }

    return response;
  } catch {
    // Cloud sessions are optional - don't fail the whole request
    return { sessions: [], available: false, count: 0 };
  }
}

// ============================================================
// Utilities
// ============================================================

/**
 * Normalize a project identifier for comparison
 * Handles git URL variations (.git suffix, trailing slashes, case)
 */
function normalizeProjectIdentifier(identifier: string): string {
  return identifier
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .trim();
}

/**
 * Convert a local session to merged format
 */
function toMergedSession(session: SessionSummarySerialized): MergedSessionSummary {
  return {
    ...session,
    source: session.source || 'local',
    projectIdentifier: session.projectIdentifier,
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
    projectIdentifier: session.projectIdentifier,
  };
}

/**
 * Merge and sort local and cloud sessions
 * Groups by projectIdentifier and sorts by lastActivityAt descending (most recent first)
 *
 * @param localSessions - Sessions from the local laptop
 * @param cloudSessions - Sessions from Modal cloud
 * @param projectIdentifier - Optional identifier to assign to sessions missing one
 */
function mergeSessions(
  localSessions: SessionSummarySerialized[],
  cloudSessions: CloudSession[],
  projectIdentifier?: string
): MergedSessionSummary[] {
  // Convert local sessions, assigning projectIdentifier if missing
  const mergedLocal = localSessions.map((s) => {
    const merged = toMergedSession(s);
    if (!merged.projectIdentifier && projectIdentifier) {
      merged.projectIdentifier = projectIdentifier;
    }
    return merged;
  });

  // Convert cloud sessions
  const mergedCloud = cloudSessions.map(cloudToMergedSession);

  const merged: MergedSessionSummary[] = [...mergedLocal, ...mergedCloud];

  // Deduplicate by session ID (same session shouldn't appear twice)
  const seenIds = new Set<string>();
  const deduplicated = merged.filter((s) => {
    if (seenIds.has(s.id)) {
      return false;
    }
    seenIds.add(s.id);
    return true;
  });

  // Sort by most recent activity
  deduplicated.sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  });

  return deduplicated;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Combined fetcher that gets both local and cloud sessions
 */
async function fetchMergedSessions(
  encodedPath: string,
  projectPath?: string,
  projectIdentifier?: string
): Promise<{
  sessions: MergedSessionSummary[];
  cloudAvailable: boolean;
  cloudCount: number;
  localCount: number;
}> {
  // Fetch both in parallel
  const [localSessions, cloudResponse] = await Promise.all([
    fetchLocalSessions(encodedPath),
    fetchCloudSessions(projectPath, projectIdentifier),
  ]);

  // Extract projectIdentifier from local sessions if not provided
  const localIdentifier =
    projectIdentifier || localSessions.find((s) => s.projectIdentifier)?.projectIdentifier;

  const merged = mergeSessions(localSessions, cloudResponse.sessions, localIdentifier);

  return {
    sessions: merged,
    cloudAvailable: cloudResponse.available,
    cloudCount: cloudResponse.count,
    localCount: localSessions.length,
  };
}

export interface UseSessionsOptions {
  /** Decoded project path for cloud session filtering */
  projectPath?: string;
  /** Git remote URL or project identifier for cross-environment matching */
  projectIdentifier?: string;
}

/**
 * Hook for fetching sessions for a specific project
 *
 * Fetches both local and cloud sessions, merging them into a single list.
 * Cloud sessions are fetched in parallel and won't block local sessions.
 * Uses projectIdentifier for accurate cross-environment matching.
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param options - Optional configuration for filtering
 * @returns Object containing merged sessions, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { sessions, isLoading, cloudAvailable, localCount, cloudCount } = useSessions(
 *   project.encodedPath,
 *   { projectPath: project.path, projectIdentifier: project.gitRemoteUrl }
 * );
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <SessionList sessions={sessions}>
 *     {cloudAvailable && <Badge>Cloud: {cloudCount}</Badge>}
 *     <Badge>Local: {localCount}</Badge>
 *   </SessionList>
 * );
 * ```
 */
export function useSessions(
  encodedPath: string | null,
  options?: UseSessionsOptions | string // string for backward compatibility (projectPath)
): UseSessionsReturn {
  // Handle backward compatibility - string arg means projectPath
  const normalizedOptions: UseSessionsOptions =
    typeof options === 'string' ? { projectPath: options } : options || {};
  const { projectPath, projectIdentifier } = normalizedOptions;

  // Create a cache key that includes all relevant identifiers
  const cacheKey = encodedPath
    ? ['sessions', encodedPath, projectPath || '', projectIdentifier || ''].join(':')
    : null;

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
        ? fetchMergedSessions(encodedPath, projectPath, projectIdentifier)
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
