/**
 * Hook for fetching changed files in a project
 *
 * Uses SWR for caching and automatic revalidation.
 * Polls at a slower interval since files change less frequently than messages.
 * Caches files to localStorage for offline viewing.
 * In cloud mode, uses cached data since Modal doesn't track file changes.
 */

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { api, getApiMode } from '@/lib/api';
import { cacheFilesChanged, getCachedFilesChanged, type CachedFileChange } from '@/lib/localCache';
import type { FileChange } from '@shared/types';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useFilesChanged hook
 */
export interface UseFilesChangedReturn {
  /** Array of changed files */
  files: FileChange[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<FileChange[] | undefined>;
  /** Number of changed files (0 if loading or error) */
  count: number;
  /** Whether data is from cache (cloud mode) */
  isCached: boolean;
}

/**
 * Hook for fetching changed files in a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @returns Object containing files, loading state, error, refresh function, and count
 *
 * @example
 * ```tsx
 * const { files, isLoading, error, count, isCached } = useFilesChanged(project.encodedPath);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * if (count === 0) return <EmptyState />;
 * return <FileList files={files} isCached={isCached} />;
 * ```
 */
export function useFilesChanged(encodedPath: string | null): UseFilesChangedReturn {
  const mode = getApiMode();
  const isCloudMode = mode === 'cloud';

  // In cloud mode, DON'T use cached files from local sessions - they're misleading
  // Cloud mode shows git changes via the CloudRepoBanner instead
  // Keeping this commented out for reference if we want session-specific file tracking later
  const cachedFiles = useMemo(() => {
    // Disabled in cloud mode - cached files are from LOCAL sessions, not current cloud session
    // In cloud mode, use the CloudRepoBanner to see pending git changes
    if (isCloudMode) return undefined;

    if (!encodedPath) return undefined;
    const cached = getCachedFilesChanged(encodedPath);
    if (!cached) return undefined;
    // Convert cached format back to FileChange format
    return cached.map((f) => ({
      path: f.path,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    })) as FileChange[];
  }, [encodedPath, isCloudMode]);

  const { data, error, isLoading, mutate } = useSWR<FileChange[]>(
    // Only fetch from API in local mode
    encodedPath && !isCloudMode ? `/projects/${encodedPath}/files` : null,
    fetcher<FileChange[]>,
    {
      // Revalidate every 5 seconds (files change less frequently than messages)
      refreshInterval: 5000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  // Cache files to localStorage for offline access (only in local mode)
  useEffect(() => {
    if (data && data.length > 0 && encodedPath && !isCloudMode) {
      // Convert to cacheable format
      const cacheable: CachedFileChange[] = data.map((f) => ({
        path: f.path,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      }));
      cacheFilesChanged(encodedPath, cacheable);
    }
  }, [data, encodedPath, isCloudMode]);

  // In cloud mode, use cached data
  const files = isCloudMode ? cachedFiles : data;

  return {
    files,
    isLoading: isCloudMode ? false : isLoading,
    error: isCloudMode ? undefined : error,
    refresh: mutate,
    count: files?.length ?? 0,
    isCached: isCloudMode && !!cachedFiles,
  };
}
