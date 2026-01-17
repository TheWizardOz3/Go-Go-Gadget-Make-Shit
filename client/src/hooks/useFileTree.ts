/**
 * Hook for fetching the committed file tree of a project
 *
 * Uses SWR for caching. Does not auto-refresh since committed files
 * don't change frequently during a session.
 * Caches tree to localStorage for offline viewing.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { cacheFileTree } from '@/lib/localCache';
import type { FileTreeResponse } from '@shared/types';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useFileTree hook
 */
export interface UseFileTreeReturn {
  /** File tree response data */
  data: FileTreeResponse | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<FileTreeResponse | undefined>;
}

/**
 * Hook for fetching the committed file tree of a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param subPath - Optional subdirectory path to fetch
 * @returns Object containing tree data, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFileTree(project.encodedPath);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * return <FileTree entries={data.entries} />;
 * ```
 */
export function useFileTree(encodedPath: string | null, subPath?: string): UseFileTreeReturn {
  // Build the API path with optional subPath query param
  const apiPath = encodedPath
    ? `/projects/${encodedPath}/tree${subPath ? `?path=${encodeURIComponent(subPath)}` : ''}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<FileTreeResponse>(
    apiPath,
    fetcher<FileTreeResponse>,
    {
      // Don't auto-refresh - committed files don't change often
      refreshInterval: 0,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  // Cache file tree to localStorage for offline access (only for root path)
  useEffect(() => {
    if (data && encodedPath && !subPath) {
      cacheFileTree(encodedPath, {
        path: data.path,
        githubUrl: data.githubUrl,
        branch: data.branch,
        entries: data.entries,
      });
    }
  }, [data, encodedPath, subPath]);

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}
