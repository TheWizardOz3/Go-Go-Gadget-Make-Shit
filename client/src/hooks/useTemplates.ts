/**
 * Hook for fetching project templates
 *
 * Uses SWR for caching. Templates are loaded from the project's
 * .claude/templates.yaml file, or fallback to defaults.
 */

import useSWR from 'swr';
import { api } from '@/lib/api';

// ============================================================
// Types
// ============================================================

/**
 * Template type matching server-side definition
 */
export interface Template {
  /** Display label */
  label: string;
  /** Icon identifier or emoji */
  icon: string;
  /** The prompt text to send */
  prompt: string;
}

/**
 * Return type for useTemplates hook
 */
export interface UseTemplatesReturn {
  /** Array of templates */
  templates: Template[] | undefined;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Error if the request failed */
  error: Error | undefined;
  /** Function to manually refresh the data */
  refresh: () => Promise<Template[] | undefined>;
}

// ============================================================
// Fetcher
// ============================================================

/**
 * SWR fetcher that uses our typed API client
 */
async function fetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook for fetching prompt templates for a project
 *
 * Loads templates from the project's .claude/templates.yaml file.
 * Falls back to default vibe-coding-prompts templates if no file exists.
 *
 * @param encodedPath - Claude's encoded project path (e.g., "-Users-derek-myproject")
 * @returns Object containing templates, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { templates, isLoading, error } = useTemplates(encodedPath);
 *
 * if (isLoading) return <TemplatesSkeleton />;
 * if (error || !templates) return null; // Silent fallback
 * return <TemplateChips templates={templates} />;
 * ```
 */
export function useTemplates(encodedPath: string | null): UseTemplatesReturn {
  const { data, error, isLoading, mutate } = useSWR<Template[]>(
    encodedPath ? `/projects/${encodedPath}/templates` : null,
    fetcher<Template[]>,
    {
      // Templates don't change often, cache longer
      revalidateOnFocus: false,
      // Don't auto-refresh - templates are static
      refreshInterval: 0,
      // Dedupe requests for 1 minute
      dedupingInterval: 60000,
      // Don't retry too aggressively
      errorRetryCount: 1,
    }
  );

  return {
    templates: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
