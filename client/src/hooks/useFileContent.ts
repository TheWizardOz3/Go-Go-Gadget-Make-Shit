/**
 * Hook for fetching committed file content from a project
 *
 * Uses SWR for caching. Does not auto-refresh since committed files
 * don't change frequently during a session.
 *
 * In cloud mode, fetches from Modal via gitRemoteUrl instead of local API.
 */

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { api, getApiMode } from '@/lib/api';
import { fetchContentViaModal } from '@/lib/github';
import type { FileContentResponse } from '@shared/types';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useFileContent hook
 */
export interface UseFileContentReturn {
  /** File content response data */
  data: FileContentResponse | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<FileContentResponse | undefined>;
  /** Source of the data */
  source?: 'local' | 'cloud';
}

/**
 * Hook for fetching committed file content from a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param filePath - The file path to fetch, or null to disable
 * @param options - Optional configuration including gitRemoteUrl for cloud mode
 * @returns Object containing file content, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * // Local mode
 * const { data, isLoading, error } = useFileContent(project.encodedPath, 'src/App.tsx');
 *
 * // Cloud mode
 * const { data, isLoading, error } = useFileContent(project.encodedPath, 'src/App.tsx', {
 *   gitRemoteUrl: project.gitRemoteUrl
 * });
 * ```
 */
export function useFileContent(
  encodedPath: string | null,
  filePath: string | null,
  options?: { gitRemoteUrl?: string }
): UseFileContentReturn {
  const { gitRemoteUrl } = options ?? {};
  const mode = getApiMode();
  const isCloudMode = mode === 'cloud';

  // State for cloud-fetched data
  const [cloudData, setCloudData] = useState<FileContentResponse | undefined>(undefined);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<Error | undefined>(undefined);

  // Build the API path - only fetch if both params are provided (for local mode)
  const apiPath =
    encodedPath && filePath && !isCloudMode ? `/projects/${encodedPath}/content/${filePath}` : null;

  // SWR for local mode
  const {
    data: localData,
    error: localError,
    isLoading: localLoading,
    mutate,
  } = useSWR<FileContentResponse>(apiPath, fetcher<FileContentResponse>, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    keepPreviousData: true,
    errorRetryCount: 2,
  });

  // Cloud mode fetching
  const fetchCloud = useCallback(async () => {
    if (!gitRemoteUrl || !filePath) return;

    setCloudLoading(true);
    setCloudError(undefined);

    try {
      const result = await fetchContentViaModal(gitRemoteUrl, filePath);
      if (!result) {
        setCloudError(new Error('Failed to connect to cloud'));
        setCloudData(undefined);
      } else if (result.error) {
        setCloudError(new Error(result.error));
        setCloudData(undefined);
      } else {
        const fileName = result.path.split('/').pop() ?? result.path;
        const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? null) : null;
        const lineCount = result.content.split('\n').length;

        const contentData: FileContentResponse = {
          path: result.path,
          name: fileName,
          extension: ext,
          language: result.language,
          content: result.content,
          lineCount,
          githubUrl: gitRemoteUrl ? `${gitRemoteUrl}/blob/main/${filePath}` : null,
        };
        setCloudData(contentData);
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setCloudLoading(false);
    }
  }, [gitRemoteUrl, filePath]);

  // Fetch from cloud when in cloud mode and filePath changes
  useEffect(() => {
    if (isCloudMode && gitRemoteUrl && filePath) {
      fetchCloud();
    }
  }, [isCloudMode, gitRemoteUrl, filePath, fetchCloud]);

  // Clear cloud data when filePath changes
  useEffect(() => {
    if (isCloudMode) {
      setCloudData(undefined);
      setCloudError(undefined);
    }
  }, [filePath, isCloudMode]);

  // Determine which data to use
  const data = isCloudMode ? cloudData : localData;
  const isLoading = isCloudMode ? cloudLoading : localLoading;
  const error = isCloudMode ? cloudError : localError;

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
