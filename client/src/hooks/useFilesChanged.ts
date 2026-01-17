/**
 * Hook for fetching changed files in a project
 *
 * Uses SWR for caching and automatic revalidation.
 * Polls at a slower interval since files change less frequently than messages.
 * Caches files to localStorage for offline viewing.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { cacheFilesChanged, type CachedFileChange } from '@/lib/localCache';
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
}

/**
 * Hook for fetching changed files in a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @returns Object containing files, loading state, error, refresh function, and count
 *
 * @example
 * ```tsx
 * const { files, isLoading, error, count } = useFilesChanged(project.encodedPath);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * if (count === 0) return <EmptyState />;
 * return <FileList files={files} />;
 * ```
 */
export function useFilesChanged(encodedPath: string | null): UseFilesChangedReturn {
  const { data, error, isLoading, mutate } = useSWR<FileChange[]>(
    // Only fetch if we have a project path
    encodedPath ? `/projects/${encodedPath}/files` : null,
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

  // Cache files to localStorage for offline access
  useEffect(() => {
    if (data && data.length > 0 && encodedPath) {
      // Convert to cacheable format
      const cacheable: CachedFileChange[] = data.map((f) => ({
        path: f.path,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      }));
      cacheFilesChanged(encodedPath, cacheable);
    }
  }, [data, encodedPath]);

  return {
    files: data,
    isLoading,
    error,
    refresh: mutate,
    count: data?.length ?? 0,
  };
}
