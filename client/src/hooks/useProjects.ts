/**
 * Hook for fetching projects list
 *
 * Uses SWR for caching and automatic revalidation.
 * Provides instant display using localStorage cache as fallback data.
 * Caches projects to localStorage for offline viewing.
 *
 * Performance optimizations:
 * - Uses fallbackData from localStorage for instant render
 * - In cloud mode, returns cached data immediately without waiting for API
 * - Deduplicates requests during mode transitions
 */

import useSWR from 'swr';
import { api, subscribeToBaseUrl, getApiBaseUrl, getApiMode } from '@/lib/api';
import { cacheProjects, getCachedProjects } from '@/lib/localCache';
import type { ProjectSerialized } from '@shared/types';
import { useEffect, useState, useMemo, useRef } from 'react';

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
  /** Whether the initial data is loading (false if showing cached data) */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<ProjectSerialized[] | undefined>;
  /** Whether showing cached/fallback data */
  isFromCache: boolean;
}

// Get cached projects once at module load for immediate availability
const initialCachedProjects = getCachedProjects();

/**
 * Hook for fetching list of projects with Claude sessions
 *
 * Optimized for fast initial render:
 * - Returns cached data immediately while fetching fresh data
 * - In cloud mode, skips API fetch entirely (uses cache only)
 * - Shows content instantly instead of loading spinners
 *
 * @returns Object containing projects, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { projects, isLoading, isFromCache } = useProjects();
 *
 * // Projects are available immediately if cached
 * if (!projects && isLoading) return <Loading />;
 * return <ProjectList projects={projects} />;
 * ```
 */
export function useProjects(): UseProjectsReturn {
  // Track the base URL to include in the SWR key
  // This ensures SWR refetches when the API endpoint changes (local → cloud)
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl);
  const [currentMode, setCurrentMode] = useState(getApiMode);

  // Track if we're showing cached data
  const showingCacheRef = useRef(false);

  // Subscribe to base URL changes
  useEffect(() => {
    return subscribeToBaseUrl((newUrl, mode) => {
      setBaseUrl(newUrl);
      setCurrentMode(mode);
    });
  }, []);

  // In cloud mode, don't even fetch from API - use cache directly
  // This avoids unnecessary network requests when laptop is unavailable
  const shouldFetch = currentMode === 'local' && baseUrl;

  // Use baseUrl in SWR key to trigger refetch when endpoint changes
  const { data, error, isLoading, mutate } = useSWR<ProjectSerialized[]>(
    shouldFetch ? ['/projects', baseUrl] : null,
    () => fetcher<ProjectSerialized[]>('/projects'),
    {
      // Use cached projects as fallback for instant render
      fallbackData: initialCachedProjects ?? undefined,
      // Revalidate every 30 seconds (projects don't change often)
      refreshInterval: 30000,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Don't retry too aggressively
      errorRetryCount: 2,
      // Keep showing previous data while revalidating
      keepPreviousData: true,
    }
  );

  // Cache projects to localStorage for offline access (only when we have fresh data from local API)
  useEffect(() => {
    if (data && data.length > 0 && currentMode === 'local' && !showingCacheRef.current) {
      cacheProjects(data);
    }
  }, [data, currentMode]);

  // Compute final projects list with caching logic
  const { projects, isFromCache } = useMemo(() => {
    // In cloud mode, always use cached local projects
    // Modal's /api/projects returns cloud session data, not the user's actual projects
    if (currentMode === 'cloud') {
      const cached = getCachedProjects();
      if (cached && cached.length > 0) {
        showingCacheRef.current = true;
        return { projects: cached, isFromCache: true };
      }
      // If no cache, return empty (user needs to connect locally once first)
      return { projects: [], isFromCache: true };
    }

    // In local mode, use API data (which may be fallbackData initially)
    showingCacheRef.current = false;
    return { projects: data, isFromCache: false };
  }, [data, currentMode]);

  // Don't show loading if we have cached data to display
  const effectiveIsLoading = isLoading && !projects?.length;

  return {
    projects,
    isLoading: effectiveIsLoading,
    error,
    refresh: mutate,
    isFromCache,
  };
}
