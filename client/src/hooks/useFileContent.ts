/**
 * Hook for fetching committed file content from a project
 *
 * Uses SWR for caching. Does not auto-refresh since committed files
 * don't change frequently during a session.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';
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
}

/**
 * Hook for fetching committed file content from a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param filePath - The file path to fetch, or null to disable
 * @returns Object containing file content, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFileContent(project.encodedPath, 'src/App.tsx');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * return <CodeViewer content={data.content} language={data.language} />;
 * ```
 */
export function useFileContent(
  encodedPath: string | null,
  filePath: string | null
): UseFileContentReturn {
  // Build the API path - only fetch if both params are provided
  const apiPath = encodedPath && filePath ? `/projects/${encodedPath}/content/${filePath}` : null;

  const { data, error, isLoading, mutate } = useSWR<FileContentResponse>(
    apiPath,
    fetcher<FileContentResponse>,
    {
      // Don't auto-refresh - committed files don't change often
      refreshInterval: 0,
      // Revalidate when window regains focus
      revalidateOnFocus: false,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}
