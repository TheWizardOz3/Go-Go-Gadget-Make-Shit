/**
 * Hook for fetching projects list
 *
 * Uses SWR for caching and automatic revalidation.
 * Waits for API endpoint initialization before fetching to ensure correct URL.
 * Caches projects to localStorage for offline viewing.
 */

import useSWR from 'swr';
import { api, subscribeToBaseUrl, getApiBaseUrl } from '@/lib/api';
import { cacheProjects } from '@/lib/localCache';
import type { ProjectSerialized } from '@shared/types';
import { useEffect, useState } from 'react';

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

/**
 * Return type for useProjects hook
 */
export interface UseProjectsReturn {
  /** Array of projects */
  projects: ProjectSerialized[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<ProjectSerialized[] | undefined>;
}

/**
 * Hook for fetching list of projects with Claude sessions
 *
 * Waits for the API endpoint to be determined before fetching.
 * This prevents fetching with the wrong URL while connectivity is being checked.
 *
 * @returns Object containing projects, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { projects, isLoading, error } = useProjects();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * return <ProjectList projects={projects} />;
 * ```
 */
export function useProjects(): UseProjectsReturn {
  // Track the base URL to include in the SWR key
  // This ensures SWR refetches when the API endpoint changes (local → cloud)
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl);

  // Subscribe to base URL changes
  useEffect(() => {
    return subscribeToBaseUrl((newUrl) => {
      setBaseUrl(newUrl);
    });
  }, []);

  // Use baseUrl in SWR key to trigger refetch when endpoint changes
  const { data, error, isLoading, mutate } = useSWR<ProjectSerialized[]>(
    baseUrl ? ['/projects', baseUrl] : null,
    () => fetcher<ProjectSerialized[]>('/projects'),
    {
      // Revalidate every 30 seconds (projects don't change often)
      refreshInterval: 30000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  // Cache projects to localStorage for offline access (only when we have data)
  useEffect(() => {
    if (data && data.length > 0) {
      cacheProjects(data);
    }
  }, [data]);

  return {
    projects: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
