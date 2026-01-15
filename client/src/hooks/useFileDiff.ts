/**
 * Hook for fetching file diff for a specific file
 *
 * Uses SWR for caching. No polling since diffs are static until manually refreshed.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';
import type { FileDiff } from '@shared/types';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useFileDiff hook
 */
export interface UseFileDiffReturn {
  /** File diff data with hunks */
  diff: FileDiff | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<FileDiff | undefined>;
}

/**
 * Hook for fetching file diff for a specific file in a project
 *
 * @param encodedPath - The encoded project path, or null to disable
 * @param filePath - The relative file path within the project, or null to disable
 * @param context - Number of context lines (default: full file)
 * @returns Object containing diff, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { diff, isLoading, error } = useFileDiff(project.encodedPath, 'src/App.tsx');
 *
 * if (isLoading) return <DiffLoadingSkeleton />;
 * if (error) return <DiffEmptyState error={error} />;
 * if (diff?.isBinary) return <BinaryFileView diff={diff} />;
 * return <DiffContent diff={diff} />;
 * ```
 */
export function useFileDiff(
  encodedPath: string | null,
  filePath: string | null,
  context?: number
): UseFileDiffReturn {
  // Build the API path with query parameters if needed
  const apiPath =
    encodedPath && filePath
      ? `/projects/${encodedPath}/files/${filePath}${context ? `?context=${context}` : ''}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<FileDiff>(
    // Only fetch if we have both project path and file path
    apiPath,
    fetcher<FileDiff>,
    {
      // No automatic revalidation - diff is static until manually refreshed
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Keep previous data while revalidating to avoid flicker
      keepPreviousData: true,
      // Retry on error (network issues, etc.)
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  return {
    diff: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
