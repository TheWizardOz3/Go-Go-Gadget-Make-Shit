/**
 * Hook for fetching projects list
 *
 * Uses SWR for caching and automatic revalidation.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';
import type { ProjectSerialized } from '@shared/types';

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
  const { data, error, isLoading, mutate } = useSWR<ProjectSerialized[]>(
    '/projects',
    fetcher<ProjectSerialized[]>,
    {
      // Revalidate every 30 seconds (projects don't change often)
      refreshInterval: 30000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
    }
  );

  return {
    projects: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
