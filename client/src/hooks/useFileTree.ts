/**
 * Hook for fetching the committed file tree of a project
 *
 * Uses SWR for caching. Does not auto-refresh since committed files
 * don't change frequently during a session.
 * Caches tree to localStorage for offline viewing.
 *
 * In cloud mode, fetches from Modal via gitRemoteUrl instead of local API.
 */

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { api, getApiMode } from '@/lib/api';
import { cacheFileTree, getCachedFileTree } from '@/lib/localCache';
import { fetchRepoTree, type NestedTreeEntry } from '@/lib/github';
import type { FileTreeResponse, FileTreeEntry } from '@shared/types';

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
  /** Source of the data (local API or cloud) */
  source?: 'local' | 'cloud';
}

/**
 * Convert nested tree entries back to flat FileTreeEntry format
 */
function flattenTree(entries: NestedTreeEntry[], result: FileTreeEntry[] = []): FileTreeEntry[] {
  for (const entry of entries) {
    result.push({
      name: entry.name,
      path: entry.path,
      type: entry.type === 'directory' ? 'directory' : 'file',
      extension: entry.extension ?? null,
      children: entry.children ? flattenTree(entry.children, []) : undefined,
    });
  }
  return result;
}

/**
 * Hook for fetching the committed file tree of a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param options - Optional configuration including gitRemoteUrl for cloud mode
 * @returns Object containing tree data, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * // Local mode
 * const { data, isLoading, error } = useFileTree(project.encodedPath);
 *
 * // Cloud mode (with git URL)
 * const { data, isLoading, error } = useFileTree(project.encodedPath, {
 *   gitRemoteUrl: project.gitRemoteUrl
 * });
 * ```
 */
export function useFileTree(
  encodedPath: string | null,
  options?: { subPath?: string; gitRemoteUrl?: string }
): UseFileTreeReturn {
  const { subPath, gitRemoteUrl } = options ?? {};
  const mode = getApiMode();
  const isCloudMode = mode === 'cloud';

  // State for cloud-fetched data - try to load from cache initially
  const [cloudData, setCloudData] = useState<FileTreeResponse | undefined>(() => {
    if (isCloudMode && encodedPath) {
      const cached = getCachedFileTree(encodedPath);
      if (cached) {
        return {
          path: cached.path,
          githubUrl: cached.githubUrl,
          branch: cached.branch,
          entries: cached.entries,
        };
      }
    }
    return undefined;
  });
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<Error | undefined>(undefined);

  // Build the API path with optional subPath query param (for local mode)
  const apiPath =
    encodedPath && !isCloudMode
      ? `/projects/${encodedPath}/tree${subPath ? `?path=${encodeURIComponent(subPath)}` : ''}`
      : null;

  // SWR for local mode
  const {
    data: localData,
    error: localError,
    isLoading: localLoading,
    mutate,
  } = useSWR<FileTreeResponse>(apiPath, fetcher<FileTreeResponse>, {
    refreshInterval: 0,
    revalidateOnFocus: true,
    keepPreviousData: true,
    errorRetryCount: 2,
  });

  // Cloud mode fetching
  const fetchCloud = useCallback(async () => {
    if (!gitRemoteUrl || !encodedPath) return;

    setCloudLoading(true);
    setCloudError(undefined);

    try {
      const result = await fetchRepoTree(gitRemoteUrl);
      if (result.error) {
        setCloudError(new Error(result.error));
        setCloudData(undefined);
      } else {
        const treeData: FileTreeResponse = {
          path: '/',
          githubUrl: gitRemoteUrl,
          branch: result.branch,
          entries: flattenTree(result.entries),
        };
        setCloudData(treeData);

        // Cache to localStorage for faster subsequent loads
        cacheFileTree(encodedPath, {
          path: treeData.path,
          githubUrl: treeData.githubUrl,
          branch: treeData.branch,
          entries: treeData.entries,
        });
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setCloudLoading(false);
    }
  }, [gitRemoteUrl, encodedPath]);

  // Fetch from cloud when in cloud mode
  useEffect(() => {
    if (isCloudMode && gitRemoteUrl && encodedPath && !subPath) {
      fetchCloud();
    }
  }, [isCloudMode, gitRemoteUrl, encodedPath, subPath, fetchCloud]);

  // Determine which data to use
  const data = isCloudMode ? cloudData : localData;
  const isLoading = isCloudMode ? cloudLoading : localLoading;
  const error = isCloudMode ? cloudError : localError;

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

  // Wrap fetchCloud to match the expected return type
  const refreshCloud = useCallback(async () => {
    await fetchCloud();
    return cloudData;
  }, [fetchCloud, cloudData]);

  return {
    data,
    isLoading,
    error,
    refresh: isCloudMode ? refreshCloud : mutate,
    source: isCloudMode ? 'cloud' : 'local',
  };
}
